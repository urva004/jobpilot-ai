import uuid
import json
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import get_db, engine, Base
from app.models import (
    CandidateProfile, Job, Application, Notification, SchedulerSettings,
    InterviewPrep, ResumeVariants, SentEmail,
    JobMatchCache, SavedJob, DismissedJob,   # Features 2, 6
)
from app.schemas import (
    CandidateProfileResponse,
    ConfidenceScores,          # Feature 3
    JobSearchRequest,
    JobResponse,
    JobMatchRequest,
    JobMatchResponse,
    ATSScoreRequest,
    ATSScoreResponse,
    TailorResumeRequest,
    TailorResumeResponse,
    CoverLetterRequest,
    CoverLetterResponse,
    GenerateEmailRequest,
    GenerateEmailResponse,
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    VALID_APP_STATUSES,        # Feature 7
    NotificationResponse,
    SchedulerSettingsResponse,
    SchedulerSettingsUpdate,
    InterviewPrepRequest,
    InterviewPrepResponse,
    ResumeVariantsRequest,
    ResumeVariantsResponse,
    GmailStatusResponse,
    EmailDraftResponse,
    EmailSendRequest,
    SavedJobResponse,          # Feature 6
    DismissedJobResponse,      # Feature 6
)
from app.services.resume_parser import ResumeParser
from app.services.mistral_service import MistralService
from app.services.job_service import JobService
from app.services.chroma_service import ChromaService
from app.services.scheduler_service import SchedulerService, start_scheduler_loop
from app.services.gmail_service import GmailService
from app.middleware import rate_limit_mistral, rate_limit_search, rate_limit_upload  # Feature 5

import asyncio
import datetime
import bcrypt as _bcrypt
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer
from fastapi import status
from app.models import User
from app.schemas import UserSignup, UserLogin, TokenResponse, UserResponse
from app.config import JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

SECRET_KEY = JWT_SECRET_KEY
ALGORITHM = JWT_ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    try:
        return _bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Hash a password with bcrypt."""
    salt = _bcrypt.gensalt()
    return _bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: datetime.timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        # Strip 'Bearer ' if present
        if token.startswith("Bearer "):
            token = token[7:]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

# Initialize database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(title="JobPilot AI API", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    try:
        from sqlalchemy import text
        from app.database import SessionLocal
        db = SessionLocal()
        
        # 1. Column migrations for existing tables
        alter_queries = [
            ("jobs", "experience_level", "VARCHAR DEFAULT 'unspecified'"),
            ("candidate_profiles", "resume_filename", "VARCHAR"),
            ("candidate_profiles", "resume_filepath", "VARCHAR"),
            ("scheduler_settings", "experience_level", "VARCHAR DEFAULT 'any'"),
            ("sent_emails", "status", "VARCHAR DEFAULT 'sent'"),
            ("sent_emails", "gmail_message_id", "VARCHAR"),
            ("sent_emails", "error_message", "TEXT"),
            ("candidate_profiles", "user_id", "VARCHAR"),
            ("jobs", "user_id", "VARCHAR"),
            ("applications", "user_id", "VARCHAR"),
            ("notifications", "user_id", "VARCHAR"),
            ("interview_prep", "user_id", "VARCHAR"),
            ("resume_variants", "user_id", "VARCHAR"),
            ("sent_emails", "user_id", "VARCHAR"),
            ("scheduler_settings", "user_id", "VARCHAR")
        ]

        for table, col, col_type in alter_queries:
            try:
                db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                db.commit()
            except Exception:
                db.rollback()

        # 2. Seed Default User if users table is empty
        try:
            # Ensure users table exists
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR PRIMARY KEY,
                    email VARCHAR UNIQUE,
                    hashed_password VARCHAR,
                    created_at TIMESTAMP
                )
            """))
            db.commit()

            default_email = "default@jobpilot.local"
            user_exists = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": default_email}).first()
            
            if not user_exists:
                default_id = "default"
                hashed_pw = get_password_hash("jobpilot123")
                db.execute(text("""
                    INSERT INTO users (id, email, hashed_password, created_at)
                    VALUES (:id, :email, :password, :created_at)
                """), {
                    "id": default_id,
                    "email": default_email,
                    "password": hashed_pw,
                    "created_at": datetime.datetime.utcnow()
                })
                db.commit()
                print("Seeded default user default@jobpilot.local / jobpilot123")
        except Exception as seed_err:
            db.rollback()
            print(f"Error seeding default user: {seed_err}")


        # 3. Migrate existing records to the default user if user_id is NULL
        tables_to_migrate = [
            "candidate_profiles", "jobs", "applications", "notifications",
            "interview_prep", "resume_variants", "sent_emails", "scheduler_settings"
        ]
        for t in tables_to_migrate:
            try:
                db.execute(text(f"UPDATE {t} SET user_id = 'default' WHERE user_id IS NULL"))
                db.commit()
            except Exception as mig_err:
                db.rollback()
                print(f"Error migrating table {t}: {mig_err}")

        db.close()
    except Exception as e:
        print(f"Startup event failed: {e}")
    asyncio.create_task(start_scheduler_loop())




# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/auth/signup", response_model=UserResponse)
def auth_signup(payload: UserSignup, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    hashed = get_password_hash(payload.password)
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=payload.email.lower().strip(),
        hashed_password=hashed
    )
    db.add(user)
    
    # Initialize default scheduler settings for the new user
    try:
        user_settings = SchedulerSettings(
            id=f"settings_{user_id}",
            keywords="Python, React, FastAPI, Software Engineer",
            location="India",
            remote_only=False,
            match_threshold=70.0,
            interval_hours=24.0,
            experience_level="any",
            is_enabled=True,
            user_id=user_id
        )
        db.add(user_settings)
    except Exception as e:
        print(f"Failed to create default settings for new user: {e}")
        
    db.commit()
    db.refresh(user)
    return user

@app.post("/auth/login", response_model=TokenResponse)
def auth_login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_email": user.email
    }


@app.get("/auth/me", response_model=UserResponse)
def auth_me(current_user: User = Depends(get_current_user)):
    """Get current logged-in user info."""
    return current_user


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@app.post("/auth/change-password")
def auth_change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change the currently logged-in user's password."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully."}


@app.delete("/auth/delete-account")
def auth_delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete the current user account and all their associated data."""
    user_id = current_user.id
    # Delete all user data across all tables (cascade)
    for model in [
        CandidateProfile, Job, Application, Notification, SchedulerSettings,
        InterviewPrep, ResumeVariants, SentEmail,
        JobMatchCache,  # Feature 2
        SavedJob,       # Feature 6
        DismissedJob,   # Feature 6
    ]:
        db.query(model).filter(model.user_id == user_id).delete()
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully."}



@app.post("/resume/upload", response_model=CandidateProfileResponse)
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Feature 5: rate limit uploads
    rate_limit_upload(current_user.id, "/resume/upload")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    try:
        contents = await file.read()
        raw_text = ResumeParser.parse(file.filename, contents)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume file: {str(e)}")

    try:
        # Extract structured data using Mistral API (Feature 3: also returns confidence block)
        profile_data = MistralService.extract_candidate_profile(raw_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract structured data via Mistral: {str(e)}")

    # Feature 3: extract and store confidence scores
    confidence_raw = profile_data.get("confidence", {})
    confidence_obj = None
    if confidence_raw:
        try:
            confidence_obj = ConfidenceScores(
                skills=float(confidence_raw.get("skills", 0.0)),
                experience=float(confidence_raw.get("experience", 0.0)),
                education=float(confidence_raw.get("education", 0.0)),
                overall=float(confidence_raw.get("overall", 0.0)),
            )
        except Exception:
            confidence_obj = None

    try:
        # Save parsed resume to SQLite
        profile_id = str(uuid.uuid4())

        import os
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)

        file_ext = os.path.splitext(file.filename)[1]
        saved_filename = f"{profile_id}{file_ext}"
        saved_filepath = os.path.join(uploads_dir, saved_filename)
        with open(saved_filepath, "wb") as f:
            f.write(contents)

        db_profile = CandidateProfile(
            id=profile_id,
            raw_resume_text=raw_text,
            skills=json.dumps(profile_data.get("skills", [])),
            projects=json.dumps(profile_data.get("projects", [])),
            education=json.dumps(profile_data.get("education", [])),
            experience=json.dumps(profile_data.get("experience", [])),
            certifications=json.dumps(profile_data.get("certifications", [])),
            links=json.dumps(profile_data.get("links", {})),
            resume_filename=file.filename,
            resume_filepath=saved_filepath,
            confidence_json=json.dumps(confidence_raw) if confidence_raw else None,  # Feature 3
            user_id=current_user.id
        )

        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)

        return CandidateProfileResponse(
            id=db_profile.id,
            raw_resume_text=db_profile.raw_resume_text,
            skills=json.loads(db_profile.skills) if db_profile.skills else [],
            projects=json.loads(db_profile.projects) if db_profile.projects else [],
            education=json.loads(db_profile.education) if db_profile.education else [],
            experience=json.loads(db_profile.experience) if db_profile.experience else [],
            certifications=json.loads(db_profile.certifications) if db_profile.certifications else [],
            links=json.loads(db_profile.links) if db_profile.links else {},
            resume_filename=db_profile.resume_filename,
            resume_filepath=db_profile.resume_filepath,
            confidence=confidence_obj,   # Feature 3
            created_at=db_profile.created_at
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/resume/active", response_model=CandidateProfileResponse)
def get_active_resume(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).order_by(CandidateProfile.created_at.desc()).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="No resume uploaded yet")

    # Feature 3: deserialize confidence scores if stored
    confidence_obj = None
    if db_profile.confidence_json:
        try:
            conf_raw = json.loads(db_profile.confidence_json)
            confidence_obj = ConfidenceScores(
                skills=float(conf_raw.get("skills", 0.0)),
                experience=float(conf_raw.get("experience", 0.0)),
                education=float(conf_raw.get("education", 0.0)),
                overall=float(conf_raw.get("overall", 0.0)),
            )
        except Exception:
            confidence_obj = None

    return CandidateProfileResponse(
        id=db_profile.id,
        raw_resume_text=db_profile.raw_resume_text,
        skills=json.loads(db_profile.skills) if db_profile.skills else [],
        projects=json.loads(db_profile.projects) if db_profile.projects else [],
        education=json.loads(db_profile.education) if db_profile.education else [],
        experience=json.loads(db_profile.experience) if db_profile.experience else [],
        certifications=json.loads(db_profile.certifications) if db_profile.certifications else [],
        links=json.loads(db_profile.links) if db_profile.links else {},
        resume_filename=db_profile.resume_filename,
        resume_filepath=db_profile.resume_filepath,
        confidence=confidence_obj,   # Feature 3
        created_at=db_profile.created_at
    )




@app.post("/jobs/search", response_model=list[JobResponse])
def search_jobs(payload: JobSearchRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    import re
    # Feature 5: rate limit job search (Adzuna/JSearch quota protection)
    rate_limit_search(current_user.id, "/jobs/search")
    try:
        jobs = JobService.search_and_save(
            db=db,
            keywords=payload.keywords,
            location=payload.location,
            remote=payload.remote
        )
        
        response_jobs = []
        email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
        for job in jobs:
            has_email = False
            if job.apply_url and job.apply_url.lower().startswith("mailto:"):
                has_email = True
            elif job.description:
                has_email = bool(re.search(email_pattern, job.description))
            
            response_jobs.append(JobResponse(
                id=job.id,
                source=job.source,
                title=job.title,
                company=job.company,
                location=job.location,
                remote=job.remote,
                salary_range=job.salary_range,
                description=job.description,
                apply_url=job.apply_url,
                has_contact_email=has_email,
                experience_level=job.experience_level or "unspecified",
                fetched_at=job.fetched_at
            ))
        return response_jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search jobs: {str(e)}")



@app.post("/jobs/match", response_model=JobMatchResponse)
def match_job(payload: JobMatchRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    import re, time
    # Feature 5: rate limit Mistral calls
    rate_limit_mistral(current_user.id, "/jobs/match")

    # ── Step 1: Fetch profile and job ─────────────────────────────────────────
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).order_by(CandidateProfile.created_at.desc()).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Please upload your resume profile first before matching.")

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found in database.")

    # ── Feature 2: Check cache (user_id + job_id + profile_id) ───────────────
    cached_entry = db.query(JobMatchCache).filter(
        JobMatchCache.user_id == current_user.id,
        JobMatchCache.job_id == payload.job_id,
        JobMatchCache.profile_id == profile.id
    ).first()
    if cached_entry:
        print(f"[MATCH user={current_user.id[:8]} job={payload.job_id[:8]}] CACHE HIT — returning cached result")
        cached_result = json.loads(cached_entry.result_json)
        return JobMatchResponse(
            job_id=payload.job_id,
            match_percent=cached_result.get("match_percent", 0.0),
            missing_skills=cached_result.get("missing_skills", []),
            strengths=cached_result.get("strengths", []),
            weaknesses=cached_result.get("weaknesses", []),
            cached=True
        )

    t_start = time.monotonic()
    log_prefix = f"[MATCH user={current_user.id[:8]} job={job.id[:8]}]"

    try:
        # ── Step 2(a): Semantic/vector retrieval (cheap — cached in ChromaDB) ─
        resume_vec_id = f"resume_{profile.id}"
        job_vec_id    = f"job_{job.id}"

        resume_vector = ChromaService.get_vector(resume_vec_id)
        if not resume_vector:
            resume_text = profile.raw_resume_text or ""
            resume_vector = MistralService.get_embeddings([resume_text])[0]
            ChromaService.upsert_vector(resume_vec_id, resume_vector, {"type": "resume", "profile_id": profile.id})

        job_vector = ChromaService.get_vector(job_vec_id)
        if not job_vector:
            job_text = f"{job.title}\n{job.company}\n{job.description}"
            job_vector = MistralService.get_embeddings([job_text])[0]
            ChromaService.upsert_vector(job_vec_id, job_vector, {"type": "job", "job_id": job.id})

        similarity = ChromaService.compute_cosine_similarity(resume_vector, job_vector)
        print(f"{log_prefix} step=vector similarity={similarity:.4f}")

        # ── Step 2(b): Hard filter — experience level vs. user preference ─────
        sched_settings = db.query(SchedulerSettings).filter(SchedulerSettings.user_id == current_user.id).first()
        exp_pref = getattr(sched_settings, "experience_level", "any") if sched_settings else "any"
        exp_filtered_out = False
        if exp_pref and exp_pref != "any" and job.experience_level not in ("unspecified", exp_pref):
            exp_filtered_out = True
            print(f"{log_prefix} step=hard_filter FILTERED (exp: job={job.experience_level} pref={exp_pref})")
        else:
            print(f"{log_prefix} step=hard_filter PASSED (exp: job={job.experience_level} pref={exp_pref})")

        # ── Step 2(c): LLM gate — only call Mistral if similarity > 0.25 ──────
        SIMILARITY_THRESHOLD = 0.25
        analysis = {"missing_skills": [], "strengths": [], "weaknesses": []}
        mistral_called = False

        if similarity > SIMILARITY_THRESHOLD and not exp_filtered_out:
            print(f"{log_prefix} step=llm_gate PASSED — calling Mistral analyze_job_match")
            analysis = MistralService.analyze_job_match(
                resume_text=profile.raw_resume_text or "",
                job_description=job.description or ""
            )
            mistral_called = True
        else:
            reason = "low_similarity" if similarity <= SIMILARITY_THRESHOLD else "exp_level_mismatch"
            print(f"{log_prefix} step=llm_gate SKIPPED ({reason}) — quota saved ✓")

        # ── Step 2(d): Final score — cosine similarity scaled + ATS blend ─────
        min_val, max_val = 0.3, 0.8
        if similarity <= min_val:
            semantic_score = float(round(similarity * 100, 1))
        else:
            scaled = 30 + ((similarity - min_val) / (max_val - min_val)) * 68
            semantic_score = float(round(min(100.0, max(0.0, scaled)), 1))

        if job.description and profile.raw_resume_text:
            jd_words = set(re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#.]{2,}\b', job.description.lower()))
            resume_words = set(re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#.]{2,}\b', (profile.raw_resume_text or "").lower()))
            if jd_words:
                ats_overlap = len(jd_words & resume_words) / len(jd_words)
                ats_score = round(ats_overlap * 100, 1)
                match_percent = float(round(0.70 * semantic_score + 0.30 * ats_score, 1))
            else:
                match_percent = semantic_score
        else:
            match_percent = semantic_score

        match_percent = min(100.0, max(0.0, match_percent))

        elapsed = round((time.monotonic() - t_start) * 1000)
        print(f"{log_prefix} step=done match={match_percent}% mistral_called={mistral_called} elapsed={elapsed}ms")

        result_payload = {
            "match_percent": match_percent,
            "missing_skills": analysis.get("missing_skills", []),
            "strengths": analysis.get("strengths", []),
            "weaknesses": analysis.get("weaknesses", []),
        }

        # ── Feature 2: Write to cache ─────────────────────────────────────────
        try:
            cache_entry = JobMatchCache(
                id=str(uuid.uuid4()),
                user_id=current_user.id,
                job_id=job.id,
                profile_id=profile.id,
                result_json=json.dumps(result_payload)
            )
            db.add(cache_entry)
            db.commit()
        except Exception as ce:
            db.rollback()
            print(f"{log_prefix} WARNING: failed to write match cache: {ce}")

        return JobMatchResponse(
            job_id=job.id,
            match_percent=match_percent,
            missing_skills=analysis.get("missing_skills", []),
            strengths=analysis.get("strengths", []),
            weaknesses=analysis.get("weaknesses", []),
            cached=False
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute match: {str(e)}")


@app.post("/jobs/{job_id}/match/refresh", response_model=JobMatchResponse)
def refresh_job_match(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Feature 2: Force re-run of match analysis by clearing the cache entry, then re-running."""
    rate_limit_mistral(current_user.id, "/jobs/match/refresh")
    # Delete existing cache entry for this (user, job, any profile)
    db.query(JobMatchCache).filter(
        JobMatchCache.user_id == current_user.id,
        JobMatchCache.job_id == job_id
    ).delete()
    db.commit()
    print(f"[MATCH/REFRESH user={current_user.id[:8]} job={job_id[:8]}] Cache cleared — forcing fresh analysis")
    # Delegate to main match logic via internal call
    from app.schemas import JobMatchRequest as JMR
    return match_job(JMR(job_id=job_id), db=db, current_user=current_user)







class JobPasteRequest(BaseModel):
    title: str = "Pasted Job"
    company: str = ""
    description: str

class JobPasteResponse(BaseModel):
    id: str
    title: str
    description: str

@app.post("/jobs/save-paste", response_model=JobPasteResponse)
def save_pasted_job(payload: JobPasteRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Accept a manually pasted JD and save it so ATS / tailoring endpoints can use it."""
    import hashlib
    job_id = hashlib.md5(f"{payload.title}|{payload.description[:200]}".encode()).hexdigest()
    db_job = db.query(Job).filter(Job.id == job_id).first()
    if not db_job:
        db_job = Job(
            id=job_id,
            source="paste",
            title=payload.title,
            company=payload.company or "Unknown Company",
            location="",
            remote=False,
            salary_range="",
            description=payload.description,
            apply_url="",
            user_id=current_user.id
        )
        db.add(db_job)
        db.commit()
        db.refresh(db_job)
    return JobPasteResponse(id=db_job.id, title=db_job.title, description=db_job.description)


@app.get("/jobs/{job_id}")
def get_job_by_id(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return a single job record by ID, with cached match result if available."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    # Try to find a cached match result
    from app.models import CandidateProfile
    from app.services.chroma_service import ChromaService
    match_data = None
    try:
        profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).order_by(CandidateProfile.created_at.desc()).first()
        if profile:
            resume_vec_id = f"resume_{profile.id}"
            job_vec_id = f"job_{job.id}"
            resume_vector = ChromaService.get_vector(resume_vec_id)
            job_vector = ChromaService.get_vector(job_vec_id)
            if resume_vector and job_vector:
                similarity = ChromaService.compute_cosine_similarity(resume_vector, job_vector)
                min_val, max_val = 0.3, 0.8
                if similarity <= min_val:
                    match_percent = float(round(similarity * 100, 1))
                else:
                    scaled = 30 + ((similarity - min_val) / (max_val - min_val)) * 68
                    match_percent = float(round(min(100.0, max(0.0, scaled)), 1))
                match_data = {"match_percent": match_percent}
    except Exception:
        pass

    return {
        "id": job.id,
        "source": job.source,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "remote": job.remote,
        "salary_range": job.salary_range,
        "description": job.description,
        "apply_url": job.apply_url,
        "fetched_at": job.fetched_at.isoformat() if job.fetched_at else None,
        "match_data": match_data,
    }


@app.post("/ats/score", response_model=ATSScoreResponse)
def ats_score(payload: ATSScoreRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rate_limit_mistral(current_user.id, "/ats/score")  # Feature 5
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).order_by(CandidateProfile.created_at.desc()).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Please upload your resume first.")

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    try:
        result = MistralService.ats_score(
            resume_text=profile.raw_resume_text or "",
            job_description=job.description or ""
        )
        return ATSScoreResponse(
            job_id=job.id,
            score=int(result.get("score", 0)),
            missing_keywords=result.get("missing_keywords", []),
            suggestions=result.get("suggestions", [])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ATS scoring failed: {str(e)}")



@app.post("/resume/tailor", response_model=TailorResumeResponse)
def tailor_resume(payload: TailorResumeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rate_limit_mistral(current_user.id, "/resume/tailor")  # Feature 5
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).order_by(CandidateProfile.created_at.desc()).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Please upload your resume first.")

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    try:
        result = MistralService.tailor_resume(
            resume_text=profile.raw_resume_text or "",
            job_description=job.description or ""
        )
        return TailorResumeResponse(
            job_id=job.id,
            summary=result.get("summary", ""),
            experience_bullets=result.get("experience_bullets", []),
            skills_to_highlight=result.get("skills_to_highlight", []),
            keywords_added=result.get("keywords_added", [])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume tailoring failed: {str(e)}")



@app.post("/generate/cover-letter", response_model=CoverLetterResponse)
def generate_cover_letter(payload: CoverLetterRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rate_limit_mistral(current_user.id, "/generate/cover-letter")  # Feature 5
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).order_by(CandidateProfile.created_at.desc()).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Please upload your resume first.")

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    try:
        result = MistralService.generate_cover_letter(
            resume_text=profile.raw_resume_text or "",
            job_title=job.title or "",
            company=job.company or "",
            job_description=job.description or ""
        )
        return CoverLetterResponse(
            job_id=job.id,
            subject_line=result.get("subject_line", ""),
            body=result.get("body", "")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")



@app.post("/generate/email", response_model=GenerateEmailResponse)
def generate_email(payload: GenerateEmailRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rate_limit_mistral(current_user.id, "/generate/email")  # Feature 5
    valid_types = {"apply", "cold", "referral", "followup", "thankyou"}
    if payload.email_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"email_type must be one of: {', '.join(valid_types)}")

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).order_by(CandidateProfile.created_at.desc()).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Please upload your resume first.")

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    try:
        result = MistralService.generate_email(
            resume_text=profile.raw_resume_text or "",
            job_title=job.title or "",
            company=job.company or "",
            job_description=job.description or "",
            email_type=payload.email_type
        )
        return GenerateEmailResponse(
            job_id=job.id,
            email_type=payload.email_type,
            subject=result.get("subject", ""),
            body=result.get("body", "")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email generation failed: {str(e)}")


# ─── Phase 6: Application Tracker ─────────────────────────────────────────────────

@app.get("/tracker", response_model=list[ApplicationResponse])
def get_applications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Application).filter(Application.user_id == current_user.id).order_by(Application.created_at.desc()).all()


@app.get("/tracker/kanban")
def get_kanban(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Feature 7: Return applications grouped by status for Kanban view."""
    all_apps = db.query(Application).filter(Application.user_id == current_user.id).order_by(Application.created_at.desc()).all()
    groups: dict = {s: [] for s in ["applied", "interview", "offer", "rejected", "withdrawn"]}
    for a in all_apps:
        status = a.status if a.status in groups else "applied"
        groups[status].append({
            "id": a.id,
            "company": a.company,
            "position": a.position,
            "job_id": a.job_id,
            "match_percent": a.match_percent,
            "status": a.status,
            "applied_date": a.applied_date,
            "notes": a.notes,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })
    return groups


@app.post("/tracker", response_model=ApplicationResponse)
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    import datetime
    if payload.status not in VALID_APP_STATUSES:  # Feature 7
        raise HTTPException(status_code=400, detail=f"Invalid status '{payload.status}'. Must be one of: {', '.join(sorted(VALID_APP_STATUSES))}")
    app_id = str(uuid.uuid4())
    db_app = Application(
        id=app_id,
        company=payload.company,
        position=payload.position,
        job_id=payload.job_id,
        match_percent=payload.match_percent,
        status=payload.status,
        applied_date=payload.applied_date or datetime.date.today().isoformat(),
        notes=payload.notes or "",
        user_id=current_user.id
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app


@app.patch("/tracker/{app_id}", response_model=ApplicationResponse)
def update_application(app_id: str, payload: ApplicationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_app = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found.")
    if payload.status is not None:
        if payload.status not in VALID_APP_STATUSES:  # Feature 7
            raise HTTPException(status_code=400, detail=f"Invalid status '{payload.status}'. Must be one of: {', '.join(sorted(VALID_APP_STATUSES))}")
        db_app.status = payload.status
    if payload.notes is not None:
        db_app.notes = payload.notes
    if payload.match_percent is not None:
        db_app.match_percent = payload.match_percent
    if payload.applied_date is not None:
        db_app.applied_date = payload.applied_date
    db.commit()
    db.refresh(db_app)
    return db_app


@app.delete("/tracker/{app_id}")
def delete_application(app_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_app = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found.")
    db.delete(db_app)
    db.commit()
    return {"message": "Application deleted."}


# ─── Feature 6: Saved / Dismissed Jobs ────────────────────────────────────────

@app.post("/jobs/{job_id}/save")
def save_job(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Save a job to the user's saved list."""
    existing = db.query(SavedJob).filter(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id).first()
    if existing:
        return {"message": "Job already saved.", "job_id": job_id}
    db.add(SavedJob(id=str(uuid.uuid4()), user_id=current_user.id, job_id=job_id))
    db.commit()
    return {"message": "Job saved.", "job_id": job_id}


@app.delete("/jobs/{job_id}/save")
def unsave_job(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Remove a job from the user's saved list."""
    deleted = db.query(SavedJob).filter(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id).delete()
    db.commit()
    return {"message": "Job removed from saved." if deleted else "Job was not saved.", "job_id": job_id}


@app.post("/jobs/{job_id}/dismiss")
def dismiss_job(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Dismiss a job (hide from future searches)."""
    existing = db.query(DismissedJob).filter(DismissedJob.user_id == current_user.id, DismissedJob.job_id == job_id).first()
    if existing:
        return {"message": "Job already dismissed.", "job_id": job_id}
    db.add(DismissedJob(id=str(uuid.uuid4()), user_id=current_user.id, job_id=job_id))
    db.commit()
    return {"message": "Job dismissed.", "job_id": job_id}


@app.delete("/jobs/{job_id}/dismiss")
def undismiss_job(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Remove a job from the user's dismissed list."""
    deleted = db.query(DismissedJob).filter(DismissedJob.user_id == current_user.id, DismissedJob.job_id == job_id).delete()
    db.commit()
    return {"message": "Job restored from dismissed." if deleted else "Job was not dismissed.", "job_id": job_id}


@app.get("/user/saved-jobs")
def get_saved_jobs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all saved jobs for the current user with full job details."""
    saved = db.query(SavedJob).filter(SavedJob.user_id == current_user.id).order_by(SavedJob.saved_at.desc()).all()
    results = []
    for s in saved:
        job = db.query(Job).filter(Job.id == s.job_id).first()
        results.append({
            "id": s.id,
            "job_id": s.job_id,
            "saved_at": s.saved_at.isoformat() if s.saved_at else None,
            "title": job.title if job else None,
            "company": job.company if job else None,
            "location": job.location if job else None,
            "remote": job.remote if job else None,
            "apply_url": job.apply_url if job else None,
            "experience_level": job.experience_level if job else None,
            "salary_range": job.salary_range if job else None,
        })
    return results


@app.get("/user/dismissed-jobs")
def get_dismissed_jobs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all dismissed job IDs for the current user."""
    dismissed = db.query(DismissedJob).filter(DismissedJob.user_id == current_user.id).all()
    return [{"job_id": d.job_id, "dismissed_at": d.dismissed_at.isoformat() if d.dismissed_at else None} for d in dismissed]




# ─── Phase 7: Daily Matching Cron / Scheduler Endpoints ─────────────────────────

@app.get("/notifications")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch all notifications, ordered by creation date, enriched with job context."""
    notifs = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()
    results = []
    for n in notifs:
        job = db.query(Job).filter(Job.id == n.job_id).first() if n.job_id else None
        results.append({
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "job_id": n.job_id,
            "match_percent": n.match_percent,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "apply_url": job.apply_url if job else None,
            "company": job.company if job else None,
            "job_title": job.title if job else None,
            "location": job.location if job else None,
        })
    return results


@app.post("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mark a specific notification as read."""
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif.is_read = True
    db.commit()
    # Return enriched dict
    job = db.query(Job).filter(Job.id == notif.job_id).first() if notif.job_id else None
    return {
        "id": notif.id,
        "title": notif.title,
        "message": notif.message,
        "job_id": notif.job_id,
        "match_percent": notif.match_percent,
        "is_read": notif.is_read,
        "created_at": notif.created_at.isoformat() if notif.created_at else None,
        "apply_url": job.apply_url if job else None,
        "company": job.company if job else None,
        "job_title": job.title if job else None,
        "location": job.location if job else None,
    }


@app.post("/notifications/read-all")
def mark_all_notifications_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mark all notifications as read."""
    db.query(Notification).filter(Notification.user_id == current_user.id).update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read."}


@app.get("/scheduler/settings", response_model=SchedulerSettingsResponse)
def get_scheduler_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch current scheduler settings."""
    return SchedulerService.get_or_create_settings(db, current_user.id)


@app.post("/scheduler/settings", response_model=SchedulerSettingsResponse)
def update_scheduler_settings(payload: SchedulerSettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update scheduler settings."""
    settings = SchedulerService.get_or_create_settings(db, current_user.id)
    if payload.keywords is not None:
        settings.keywords = payload.keywords
    if payload.location is not None:
        settings.location = payload.location
    if payload.remote_only is not None:
        settings.remote_only = payload.remote_only
    if payload.match_threshold is not None:
        settings.match_threshold = payload.match_threshold
    if payload.interval_hours is not None:
        settings.interval_hours = payload.interval_hours
    if payload.experience_level is not None:
        settings.experience_level = payload.experience_level
    if payload.is_enabled is not None:
        settings.is_enabled = payload.is_enabled
    db.commit()
    db.refresh(settings)
    return settings


@app.post("/scheduler/trigger")
def trigger_scheduler_matching(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Run the scheduler matching cycle manually and return the results immediately."""
    result = SchedulerService.run_matching_cycle(db, current_user.id)
    return result


# ─── Phase 8: Interview Prep Generator ──────────────────────────────────────────────────

@app.post("/interview/prep", response_model=InterviewPrepResponse)
def generate_interview_prep(payload: InterviewPrepRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Generate or return cached interview questions for a specific job."""
    # 1. Check cache first
    cached = db.query(InterviewPrep).filter(InterviewPrep.job_id == payload.job_id, InterviewPrep.user_id == current_user.id).first()
    if cached:
        result = json.loads(cached.result_json)
        return InterviewPrepResponse(
            job_id=payload.job_id,
            technical_questions=result.get("technical_questions", []),
            coding_questions=result.get("coding_questions", []),
            system_design_questions=result.get("system_design_questions", []),
            hr_questions=result.get("hr_questions", []),
            behavioral_questions=result.get("behavioral_questions", []),
        )

    # 2. Fetch active profile and job
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).order_by(CandidateProfile.created_at.desc()).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Please upload your resume first.")

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    try:
        # Generate using Mistral Service
        result = MistralService.generate_interview_questions(
            resume_text=profile.raw_resume_text or "",
            job_title=job.title or "",
            job_description=job.description or ""
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

    # 3. Cache result
    try:
        db_prep = InterviewPrep(
            id=str(uuid.uuid4()),
            job_id=payload.job_id,
            result_json=json.dumps(result),
            user_id=current_user.id
        )
        db.add(db_prep)
        db.commit()
    except Exception:
        db.rollback()  # cache write failure is non-fatal

    return InterviewPrepResponse(
        job_id=payload.job_id,
        technical_questions=result.get("technical_questions", []),
        coding_questions=result.get("coding_questions", []),
        system_design_questions=result.get("system_design_questions", []),
        hr_questions=result.get("hr_questions", []),
        behavioral_questions=result.get("behavioral_questions", []),
    )


# ─── Phase 9: Resume Variants (A/B/C) ───────────────────────────────────────────────────

@app.post("/resume/variants", response_model=ResumeVariantsResponse)
def generate_resume_variants(payload: ResumeVariantsRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Generate or return cached resume variants (Backend / AI-ML / Data) for the active profile."""
    # 1. Get the profile
    if payload.profile_id:
        profile = db.query(CandidateProfile).filter(CandidateProfile.id == payload.profile_id, CandidateProfile.user_id == current_user.id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Candidate profile not found.")
    else:
        profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).order_by(CandidateProfile.created_at.desc()).first()
        if not profile:
            raise HTTPException(status_code=400, detail="Please upload your resume first.")

    # 2. Check cache
    cached = db.query(ResumeVariants).filter(ResumeVariants.profile_id == profile.id, ResumeVariants.user_id == current_user.id).first()
    if cached:
        variants_data = json.loads(cached.variants_json)
        return ResumeVariantsResponse(
            profile_id=profile.id,
            variants=variants_data.get("variants", [])
        )

    # 3. Build candidate_profile dict
    candidate_profile = {
        "skills": json.loads(profile.skills) if profile.skills else [],
        "experience": json.loads(profile.experience) if profile.experience else [],
        "projects": json.loads(profile.projects) if profile.projects else [],
        "education": json.loads(profile.education) if profile.education else [],
        "certifications": json.loads(profile.certifications) if profile.certifications else [],
    }

    try:
        result = MistralService.generate_resume_variants(candidate_profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume variant generation failed: {str(e)}")

    # 4. Cache result
    try:
        variants_id = str(uuid.uuid4())
        db_variants = ResumeVariants(
            id=variants_id,
            profile_id=profile.id,
            variants_json=json.dumps(result)
        )
        db.add(db_variants)
        db.commit()
    except Exception:
        db.rollback()  # Cache failure is non-fatal

    return ResumeVariantsResponse(
        profile_id=profile.id,
        variants=result.get("variants", [])
    )


@app.delete("/resume/variants/cache")
def clear_variants_cache(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Clear cached resume variants so the next request regenerates them."""
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).order_by(CandidateProfile.created_at.desc()).first()
    if not profile:
        raise HTTPException(status_code=400, detail="No profile found.")
    deleted = db.query(ResumeVariants).filter(ResumeVariants.profile_id == profile.id, ResumeVariants.user_id == current_user.id).delete()
    db.commit()
    return {"message": f"Cache cleared ({deleted} record(s) removed)."}


@app.delete("/interview/prep/{job_id}/cache")
def clear_interview_cache(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Clear cached interview prep for a job so the next request regenerates it."""
    deleted = db.query(InterviewPrep).filter(InterviewPrep.job_id == job_id, InterviewPrep.user_id == current_user.id).delete()
    db.commit()
    return {"message": f"Cache cleared ({deleted} record(s) removed)."}


# ─── Phase 10: Automated Email Job Application Endpoints ─────────────────────────────────

@app.get("/gmail/auth")
def gmail_auth(current_user: User = Depends(get_current_user)):
    """Get the Google OAuth authentication URL to redirect the user."""
    try:
        auth_url = GmailService.get_auth_url()
        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/gmail/callback")
def gmail_callback(code: str):
    """Callback from Google OAuth flow. Saves the credentials and redirects back to the frontend."""
    try:
        GmailService.save_credentials(code)
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="http://localhost:5173/?gmail_auth=success")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth callback failed: {str(e)}")


@app.get("/gmail/status", response_model=GmailStatusResponse)
def gmail_status(current_user: User = Depends(get_current_user)):
    """Check if Gmail is connected and get the authorized user's email."""
    email = GmailService.get_profile_email()
    connected = email is not None
    return GmailStatusResponse(connected=connected, email=email)


@app.post("/gmail/disconnect")
def gmail_disconnect(current_user: User = Depends(get_current_user)):
    """Disconnect Gmail (delete token)."""
    GmailService.disconnect()
    return {"message": "Gmail disconnected successfully."}


@app.get("/gmail/daily-count")
def gmail_daily_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return how many emails were sent today."""
    import datetime
    today = datetime.date.today()
    start_of_day = datetime.datetime.combine(today, datetime.time.min)
    end_of_day = datetime.datetime.combine(today, datetime.time.max)
    
    count = db.query(SentEmail).filter(
        SentEmail.user_id == current_user.id,
        SentEmail.sent_at >= start_of_day,
        SentEmail.sent_at <= end_of_day
    ).count()
    
    return {"count": count, "limit": 15}


@app.post("/jobs/{job_id}/draft-application-email", response_model=EmailDraftResponse)
def draft_application_email(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Generate email subject and body for applying to a specific job."""
    # 1. Fetch active profile
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).order_by(CandidateProfile.created_at.desc()).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Please upload your resume profile first.")

    # 2. Fetch the job
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    # 3. Extract contact emails
    contact_emails = GmailService.extract_contact_emails(job.description or "", job.apply_url or "")
    has_contact_email = len(contact_emails) > 0
    to_email = contact_emails[0] if has_contact_email else ""

    # 4. Generate email draft subject/body
    try:
        result = MistralService.generate_email(
            resume_text=profile.raw_resume_text or "",
            job_title=job.title or "",
            company=job.company or "",
            job_description=job.description or "",
            email_type="apply"
        )
        subject = result.get("subject", f"Application for {job.title} - {job.company}")
        body = result.get("body", "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate draft body: {str(e)}")

    # 5. Default attachment name & variant suggestion
    attachment_name = profile.resume_filename or "Resume.docx"
    
    suggested_variant = "backend"  # default
    full_text = ((job.title or "") + " " + (job.description or "")).lower()
    if any(x in full_text for x in ["ai", "ml", "machine learning", "deep learning", "nlp", "vision", "artificial", "intelligence"]):
        suggested_variant = "ai_ml"
    elif any(x in full_text for x in ["data", "analytics", "analysis", "bi", "sql", "tableau", "powerbi"]):
        suggested_variant = "data"

    return EmailDraftResponse(
        to_email=to_email,
        subject=subject,
        body=body,
        attachment_name=attachment_name,
        has_contact_email=has_contact_email,
        contact_emails=contact_emails,
        suggested_variant=suggested_variant
    )


@app.post("/jobs/{job_id}/send-application-email")
def send_application_email(job_id: str, payload: EmailSendRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Send the application email with optional tailored resume attachment."""
    # 1. Rate limiting check (15/day)
    import datetime
    today = datetime.date.today()
    start_of_day = datetime.datetime.combine(today, datetime.time.min)
    end_of_day = datetime.datetime.combine(today, datetime.time.max)
    
    count = db.query(SentEmail).filter(
        SentEmail.user_id == current_user.id,
        SentEmail.sent_at >= start_of_day,
        SentEmail.sent_at <= end_of_day
    ).count()
    
    if count >= 15:
        raise HTTPException(status_code=400, detail="Daily rate limit of 15 emails reached.")

    # 2. Duplicate send check
    exists = db.query(SentEmail).filter(
        SentEmail.user_id == current_user.id,
        SentEmail.job_id == job_id,
        SentEmail.to_email == payload.to_email
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail=f"You have already sent an application email to {payload.to_email} for this job.")

    # 3. Get active profile
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).order_by(CandidateProfile.created_at.desc()).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Please upload your resume profile first.")

    # 4. Get the job
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    # 5. Resolve attachment path
    attachment_path = None
    attachment_name = None
    
    if payload.variant and payload.variant in ["backend", "ai_ml", "data"]:
        # Generate tailored variant resume on the fly using python-docx
        # A. Fetch cached variants
        cached_var = db.query(ResumeVariants).filter(ResumeVariants.profile_id == profile.id, ResumeVariants.user_id == current_user.id).first()
        if not cached_var:
            raise HTTPException(status_code=400, detail="Please generate resume variants in the Resume Variants page first.")
        
        variants_data = json.loads(cached_var.variants_json)
        selected_var = None
        for v in variants_data.get("variants", []):
            if v.get("variant") == payload.variant:
                selected_var = v
                break
                
        if not selected_var:
            raise HTTPException(status_code=400, detail=f"Variant '{payload.variant}' not found in cache.")

        # B. Write docx using python-docx
        import docx
        doc = docx.Document()
        
        # Add Title / Header
        title_para = doc.add_paragraph()
        title_run = title_para.add_run(f"Resume - Tailored ({payload.variant.upper()} framing)")
        title_run.bold = True
        title_run.font.size = docx.shared.Pt(18)
        
        # Professional Summary
        doc.add_heading("Professional Summary", level=2)
        doc.add_paragraph(selected_var.get("professional_summary", ""))
        
        # Skills
        doc.add_heading("Key Skills", level=2)
        doc.add_paragraph(" • ".join(selected_var.get("reordered_skills", [])))
        
        # Experience
        doc.add_heading("Experience Highlights", level=2)
        for exp in selected_var.get("reworded_experience_bullets", []):
            role_p = doc.add_paragraph()
            role_run = role_p.add_run(exp.get("original_role", ""))
            role_run.bold = True
            for bullet in exp.get("bullets", []):
                clean_bullet = bullet.strip().lstrip("•").strip()
                doc.add_paragraph(clean_bullet, style="List Bullet")
                
        # Projects
        doc.add_heading("Highlighted Projects", level=2)
        doc.add_paragraph(", ".join(selected_var.get("highlighted_projects", [])))
        
        # Save tailored resume
        import os
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        attachment_name = f"Resume_Tailored_{payload.variant}.docx"
        attachment_path = os.path.join(uploads_dir, f"{profile.id}_{attachment_name}")
        doc.save(attachment_path)
    else:
        # Base resume
        attachment_path = profile.resume_filepath
        attachment_name = profile.resume_filename

    # 6. Send via Gmail API
    gmail_msg_id = None
    send_error = None
    try:
        res_data = GmailService.send_email(
            to=payload.to_email,
            subject=payload.subject,
            body=payload.body,
            attachment_path=attachment_path
        )
        if res_data and isinstance(res_data, dict):
            gmail_msg_id = res_data.get("id")
    except Exception as e:
        send_error = str(e)

    # 7. Log to DB
    sent_id = str(uuid.uuid4())
    db_sent = SentEmail(
        id=sent_id,
        job_id=job_id,
        to_email=payload.to_email,
        subject=payload.subject,
        body=payload.body,
        attachment_name=attachment_name,
        status="sent" if not send_error else "failed",
        gmail_message_id=gmail_msg_id,
        error_message=send_error,
        user_id=current_user.id
    )
    db.add(db_sent)

    if send_error:
        try:
            db.commit()
        except Exception:
            db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to send email: {send_error}")

    # 8. Tracker integration: Create or update tracker entry
    try:
        tracker = db.query(Application).filter(Application.job_id == job_id, Application.user_id == current_user.id).first()
        if not tracker:
            tracker = Application(
                id=str(uuid.uuid4()),
                job_id=job_id,
                company=job.company or "Unknown Company",
                position=job.title or "Pasted Position",
                status="applied",
                applied_date=today.isoformat(),
                notes=f"[Sent Email to {payload.to_email} on {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}]\nSubject: {payload.subject}\n\n{payload.body}",
                user_id=current_user.id
            )
            db.add(tracker)
        else:
            tracker.status = "applied"
            tracker.applied_date = today.isoformat()
            tracker.notes = (tracker.notes or "") + f"\n\n[Sent Email to {payload.to_email} on {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}]\nSubject: {payload.subject}\n\n{payload.body}"
            
        db.commit()
    except Exception as e:
        db.rollback()
        # Even if DB logging fails, the email was sent, so warn but do not crash
        return {"success": True, "message": f"Email sent, but logging failed: {str(e)}", "gmail_message_id": gmail_msg_id}

    return {"success": True, "message": "Email sent successfully! Application tracker updated.", "gmail_message_id": gmail_msg_id}


