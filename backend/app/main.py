import uuid
import json
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import get_db, engine, Base
from app.models import CandidateProfile, Job, Application, Notification, SchedulerSettings
from app.schemas import (
    CandidateProfileResponse, 
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
    NotificationResponse,
    SchedulerSettingsResponse,
    SchedulerSettingsUpdate
)
from app.services.resume_parser import ResumeParser
from app.services.mistral_service import MistralService
from app.services.job_service import JobService
from app.services.chroma_service import ChromaService
from app.services.scheduler_service import SchedulerService, start_scheduler_loop
import asyncio

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="JobPilot AI API", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(start_scheduler_loop())


# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/resume/upload", response_model=CandidateProfileResponse)
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
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
        # Extract structured data using Mistral API
        profile_data = MistralService.extract_candidate_profile(raw_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract structured data via Mistral: {str(e)}")
        
    try:
        # Save parsed resume to SQLite
        profile_id = str(uuid.uuid4())
        
        db_profile = CandidateProfile(
            id=profile_id,
            raw_resume_text=raw_text,
            skills=json.dumps(profile_data.get("skills", [])),
            projects=json.dumps(profile_data.get("projects", [])),
            education=json.dumps(profile_data.get("education", [])),
            experience=json.dumps(profile_data.get("experience", [])),
            certifications=json.dumps(profile_data.get("certifications", [])),
            links=json.dumps(profile_data.get("links", {}))
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
            created_at=db_profile.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/resume/active", response_model=CandidateProfileResponse)
def get_active_resume(db: Session = Depends(get_db)):
    db_profile = db.query(CandidateProfile).order_by(CandidateProfile.created_at.desc()).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="No resume uploaded yet")
        
    return CandidateProfileResponse(
        id=db_profile.id,
        raw_resume_text=db_profile.raw_resume_text,
        skills=json.loads(db_profile.skills) if db_profile.skills else [],
        projects=json.loads(db_profile.projects) if db_profile.projects else [],
        education=json.loads(db_profile.education) if db_profile.education else [],
        experience=json.loads(db_profile.experience) if db_profile.experience else [],
        certifications=json.loads(db_profile.certifications) if db_profile.certifications else [],
        links=json.loads(db_profile.links) if db_profile.links else {},
        created_at=db_profile.created_at
    )

@app.post("/jobs/search", response_model=list[JobResponse])
def search_jobs(payload: JobSearchRequest, db: Session = Depends(get_db)):
    try:
        jobs = JobService.search_and_save(
            db=db,
            keywords=payload.keywords,
            location=payload.location,
            remote=payload.remote
        )
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search jobs: {str(e)}")

@app.post("/jobs/match", response_model=JobMatchResponse)
def match_job(payload: JobMatchRequest, db: Session = Depends(get_db)):
    # 1. Fetch the active profile
    profile = db.query(CandidateProfile).order_by(CandidateProfile.created_at.desc()).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Please upload your resume profile first before matching.")

    # 2. Fetch the job details
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found in database.")

    try:
        # 3. Handle vector embeddings via ChromaDB
        resume_vec_id = f"resume_{profile.id}"
        job_vec_id = f"job_{job.id}"

        # Fetch or generate resume embedding
        resume_vector = ChromaService.get_vector(resume_vec_id)
        if not resume_vector:
            resume_text = profile.raw_resume_text or ""
            resume_vector = MistralService.get_embeddings([resume_text])[0]
            ChromaService.upsert_vector(resume_vec_id, resume_vector, {"type": "resume", "profile_id": profile.id})

        # Fetch or generate job embedding
        job_vector = ChromaService.get_vector(job_vec_id)
        if not job_vector:
            job_text = f"{job.title}\n{job.company}\n{job.description}"
            job_vector = MistralService.get_embeddings([job_text])[0]
            ChromaService.upsert_vector(job_vec_id, job_vector, {"type": "job", "job_id": job.id})

        # 4. Compute similarity and score
        similarity = ChromaService.compute_cosine_similarity(resume_vector, job_vector)
        
        # Scaling cosine similarity [0.3, 0.8] to [30%, 98%]
        min_val, max_val = 0.3, 0.8
        if similarity <= min_val:
            match_percent = float(round(similarity * 100, 1))
        else:
            scaled = 30 + ((similarity - min_val) / (max_val - min_val)) * 68
            match_percent = float(round(min(100.0, max(0.0, scaled)), 1))

        # 5. Perform Mistral detailed skill gap analysis
        analysis = MistralService.analyze_job_match(
            resume_text=profile.raw_resume_text or "",
            job_description=job.description or ""
        )

        return JobMatchResponse(
            job_id=job.id,
            match_percent=match_percent,
            missing_skills=analysis.get("missing_skills", []),
            strengths=analysis.get("strengths", []),
            weaknesses=analysis.get("weaknesses", [])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute match: {str(e)}")


class JobPasteRequest(BaseModel):
    title: str = "Pasted Job"
    company: str = ""
    description: str

class JobPasteResponse(BaseModel):
    id: str
    title: str
    description: str

@app.post("/jobs/save-paste", response_model=JobPasteResponse)
def save_pasted_job(payload: JobPasteRequest, db: Session = Depends(get_db)):
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
            apply_url=""
        )
        db.add(db_job)
        db.commit()
        db.refresh(db_job)
    return JobPasteResponse(id=db_job.id, title=db_job.title, description=db_job.description)

@app.post("/ats/score", response_model=ATSScoreResponse)
def ats_score(payload: ATSScoreRequest, db: Session = Depends(get_db)):
    profile = db.query(CandidateProfile).order_by(CandidateProfile.created_at.desc()).first()
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
def tailor_resume(payload: TailorResumeRequest, db: Session = Depends(get_db)):
    profile = db.query(CandidateProfile).order_by(CandidateProfile.created_at.desc()).first()
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
def generate_cover_letter(payload: CoverLetterRequest, db: Session = Depends(get_db)):
    profile = db.query(CandidateProfile).order_by(CandidateProfile.created_at.desc()).first()
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
def generate_email(payload: GenerateEmailRequest, db: Session = Depends(get_db)):
    valid_types = {"apply", "cold", "referral", "followup", "thankyou"}
    if payload.email_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"email_type must be one of: {', '.join(valid_types)}")

    profile = db.query(CandidateProfile).order_by(CandidateProfile.created_at.desc()).first()
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


# ─── Phase 6: Application Tracker ────────────────────────────────────────────────

@app.get("/tracker", response_model=list[ApplicationResponse])
def get_applications(db: Session = Depends(get_db)):
    return db.query(Application).order_by(Application.created_at.desc()).all()


@app.post("/tracker", response_model=ApplicationResponse)
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db)):
    import datetime
    app_id = str(uuid.uuid4())
    db_app = Application(
        id=app_id,
        company=payload.company,
        position=payload.position,
        job_id=payload.job_id,
        match_percent=payload.match_percent,
        status=payload.status,
        applied_date=payload.applied_date or datetime.date.today().isoformat(),
        notes=payload.notes or ""
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app


@app.patch("/tracker/{app_id}", response_model=ApplicationResponse)
def update_application(app_id: str, payload: ApplicationUpdate, db: Session = Depends(get_db)):
    db_app = db.query(Application).filter(Application.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found.")
    if payload.status is not None:
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
def delete_application(app_id: str, db: Session = Depends(get_db)):
    db_app = db.query(Application).filter(Application.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found.")
    db.delete(db_app)
    db.commit()
    return {"message": "Application deleted."}


# ─── Phase 7: Daily Matching Cron / Scheduler Endpoints ─────────────────────────

@app.get("/notifications", response_model=list[NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    """Fetch all notifications, ordered by creation date."""
    return db.query(Notification).order_by(Notification.created_at.desc()).all()


@app.post("/notifications/{notif_id}/read", response_model=NotificationResponse)
def mark_notification_read(notif_id: str, db: Session = Depends(get_db)):
    """Mark a specific notification as read."""
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@app.post("/notifications/read-all")
def mark_all_notifications_read(db: Session = Depends(get_db)):
    """Mark all notifications as read."""
    db.query(Notification).update({Notification.is_read: True})
    db.commit()
    return {"message": "All notifications marked as read."}


@app.get("/scheduler/settings", response_model=SchedulerSettingsResponse)
def get_scheduler_settings(db: Session = Depends(get_db)):
    """Fetch current scheduler settings."""
    return SchedulerService.get_or_create_settings(db)


@app.post("/scheduler/settings", response_model=SchedulerSettingsResponse)
def update_scheduler_settings(payload: SchedulerSettingsUpdate, db: Session = Depends(get_db)):
    """Update scheduler settings."""
    settings = SchedulerService.get_or_create_settings(db)
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
    if payload.is_enabled is not None:
        settings.is_enabled = payload.is_enabled
    db.commit()
    db.refresh(settings)
    return settings


@app.post("/scheduler/trigger")
def trigger_scheduler_matching(db: Session = Depends(get_db)):
    """Run the scheduler matching cycle manually and return the results immediately."""
    result = SchedulerService.run_matching_cycle(db)
    return result

