"""Resume routes: upload, import, active profile, tailor, variants."""

import json
import uuid
import os
import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, CandidateProfile, ResumeVariants, Job
from app.schemas import (
    CandidateProfileResponse,
    CandidateProfileImport,
    ConfidenceScores,
    ResumeVariantsRequest,
    ResumeVariantsResponse,
    TailorResumeRequest,
    TailorResumeResponse,
)
from app.dependencies import get_current_user, get_current_user_optional, resolve_resume_text
from app.services.resume_parser import ResumeParser
from app.services.mistral_service import MistralService
from app.services.cache_service import CacheService
from app.middleware import rate_limit_upload, rate_limit_mistral

router = APIRouter(tags=["Resumes"])


def mark_drafts_as_stale_for_new_resume(db: Session, user_id: str, new_resume_version: str):
    from app.models import AutoApplyQueue
    from app.queue_app import log_activity_event

    drafts = (
        db.query(AutoApplyQueue)
        .filter(
            AutoApplyQueue.user_id == user_id,
            AutoApplyQueue.status != "applied",
            AutoApplyQueue.resume_version != new_resume_version,
        )
        .all()
    )
    for d in drafts:
        old_ver = d.resume_version
        d.status = "stale"
        log_activity_event(
            db=db,
            user_id=user_id,
            event_type="staleness_event",
            job_id=d.job_id,
            details=f"Draft status marked as stale due to new resume upload (previous resume version was {old_ver[:8]}, new version is {new_resume_version[:8]}).",
        )
    db.commit()


@router.post("/resume/upload", response_model=CandidateProfileResponse)
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    user_key = current_user.id if current_user else request.client.host
    rate_limit_upload(user_key, "/resume/upload")

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
        profile_data = MistralService.extract_candidate_profile(raw_text)
    except Exception as e:
        print(f"[Upload Resume] Error during extraction: {e}. Utilizing fallback profile extractor.")
        profile_data = MistralService._fallback_extract_profile(raw_text)

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

    profile_id = str(uuid.uuid4())

    if not current_user:
        return CandidateProfileResponse(
            id=profile_id,
            raw_resume_text=raw_text,
            skills=profile_data.get("skills", []),
            projects=profile_data.get("projects", []),
            education=profile_data.get("education", []),
            experience=profile_data.get("experience", []),
            certifications=profile_data.get("certifications", []),
            links=profile_data.get("links", {}),
            resume_filename=file.filename,
            resume_filepath=None,
            confidence=confidence_obj,
            created_at=datetime.datetime.utcnow(),
        )

    try:
        uploads_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads"
        )
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
            confidence_json=json.dumps(confidence_raw) if confidence_raw else None,
            user_id=current_user.id,
        )

        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)

        if current_user:
            mark_drafts_as_stale_for_new_resume(db, current_user.id, db_profile.id)
            CacheService.invalidate_user_resume(current_user.id)

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
            confidence=confidence_obj,
            created_at=db_profile.created_at,
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/resume/import", response_model=CandidateProfileResponse)
def import_resume(
    payload: CandidateProfileImport,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile_id = str(uuid.uuid4())
    confidence_json = json.dumps(payload.confidence) if payload.confidence else None

    db_profile = CandidateProfile(
        id=profile_id,
        raw_resume_text=payload.raw_resume_text,
        skills=json.dumps(payload.skills),
        projects=json.dumps(payload.projects),
        education=json.dumps(payload.education),
        experience=json.dumps(payload.experience),
        certifications=json.dumps(payload.certifications),
        links=json.dumps(payload.links),
        resume_filename=payload.resume_filename or "Guest Resume",
        resume_filepath=None,
        confidence_json=confidence_json,
        user_id=current_user.id,
    )

    try:
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)
        mark_drafts_as_stale_for_new_resume(db, current_user.id, db_profile.id)
        CacheService.invalidate_user_resume(current_user.id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during import: {str(e)}")

    confidence_obj = None
    if payload.confidence:
        try:
            confidence_obj = ConfidenceScores(
                skills=float(payload.confidence.get("skills", 0.0)),
                experience=float(payload.confidence.get("experience", 0.0)),
                education=float(payload.confidence.get("education", 0.0)),
                overall=float(payload.confidence.get("overall", 0.0)),
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
        confidence=confidence_obj,
        created_at=db_profile.created_at,
    )


@router.get("/resume/active", response_model=CandidateProfileResponse)
def get_active_resume(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    if not current_user:
        raise HTTPException(status_code=404, detail="No active profile found")
    db_profile = (
        db.query(CandidateProfile)
        .filter(CandidateProfile.user_id == current_user.id)
        .order_by(CandidateProfile.created_at.desc())
        .first()
    )
    if not db_profile:
        raise HTTPException(status_code=404, detail="No active profile found")

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
        confidence=confidence_obj,
        created_at=db_profile.created_at,
    )


@router.post("/resume/tailor", response_model=TailorResumeResponse)
def tailor_resume(
    request: Request,
    payload: TailorResumeRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    user_key = current_user.id if current_user else request.client.host
    rate_limit_mistral(user_key, "/resume/tailor")

    resume_text = resolve_resume_text(current_user, payload.guest_profile, db)

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    try:
        result = MistralService.tailor_resume(
            resume_text=resume_text, job_description=job.description or ""
        )
        return TailorResumeResponse(
            job_id=job.id,
            summary=result.get("summary", ""),
            experience_bullets=result.get("experience_bullets", []),
            skills_to_highlight=result.get("skills_to_highlight", []),
            keywords_added=result.get("keywords_added", []),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume tailoring failed: {str(e)}")


@router.post("/resume/variants", response_model=ResumeVariantsResponse)
def get_resume_variants(
    request: Request,
    payload: ResumeVariantsRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    user_key = current_user.id if current_user else request.client.host
    rate_limit_mistral(user_key, "/resume/variants")

    resume_text = resolve_resume_text(current_user, payload.guest_profile, db)
    profile_id = current_user.id if current_user else None

    try:
        if current_user:
            cached = (
                db.query(ResumeVariants)
                .filter(
                    ResumeVariants.profile_id == profile_id,
                    ResumeVariants.user_id == current_user.id,
                )
                .first()
            )
            if cached:
                return ResumeVariantsResponse(
                    profile_id=profile_id,
                    variants=json.loads(cached.variants_json).get("variants", []),
                    cached=True,
                )

        # Generate variants via Mistral
        result = MistralService.generate_resume_variants(resume_text)
        variants_list = result.get("variants", [])

        if current_user:
            cached_entry = ResumeVariants(
                id=str(uuid.uuid4()),
                profile_id=profile_id,
                variants_json=json.dumps({"variants": variants_list}),
                user_id=current_user.id,
            )
            db.add(cached_entry)
            db.commit()

        return ResumeVariantsResponse(
            profile_id=profile_id or str(uuid.uuid4()),
            variants=variants_list,
            cached=False,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate resume variants: {str(e)}")


@router.delete("/resume/variants/cache")
def clear_resume_variants_cache(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(ResumeVariants).filter(ResumeVariants.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Resume variants cache cleared."}
