from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class ProjectSchema(BaseModel):
    name: str
    description: str
    tech: List[str] = []

class EducationSchema(BaseModel):
    degree: str
    institution: str
    year: str

class ExperienceSchema(BaseModel):
    role: str
    company: str
    duration: str
    highlights: List[str] = []

class LinksSchema(BaseModel):
    github: Optional[str] = ""
    linkedin: Optional[str] = ""
    portfolio: Optional[str] = ""

class CandidateProfileBase(BaseModel):
    skills: List[str] = []
    projects: List[ProjectSchema] = []
    education: List[EducationSchema] = []
    experience: List[ExperienceSchema] = []
    certifications: List[str] = []
    links: LinksSchema = Field(default_factory=LinksSchema)

class CandidateProfileCreate(CandidateProfileBase):
    raw_resume_text: Optional[str] = None

class CandidateProfileResponse(CandidateProfileBase):
    id: str
    raw_resume_text: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class JobSearchRequest(BaseModel):
    keywords: str = ""
    location: str = ""
    remote: bool = False

class JobResponse(BaseModel):
    id: str
    source: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    remote: bool = False
    salary_range: Optional[str] = None
    description: Optional[str] = None
    apply_url: Optional[str] = None
    fetched_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class JobMatchRequest(BaseModel):
    job_id: str

class JobMatchResponse(BaseModel):
    job_id: str
    match_percent: float
    missing_skills: List[str] = []
    strengths: List[str] = []
    weaknesses: List[str] = []

# ─── Phase 4: ATS + Tailoring ───────────────────────────────────────────────

class ATSScoreRequest(BaseModel):
    job_id: str

class ATSScoreResponse(BaseModel):
    job_id: str
    score: int
    missing_keywords: List[str] = []
    suggestions: List[str] = []

class TailorResumeRequest(BaseModel):
    job_id: str

class TailorResumeResponse(BaseModel):
    job_id: str
    summary: str = ""
    experience_bullets: List[str] = []
    skills_to_highlight: List[str] = []
    keywords_added: List[str] = []

# ─── Phase 5: Writing Agent ───────────────────────────────────────────────────

class CoverLetterRequest(BaseModel):
    job_id: str

class CoverLetterResponse(BaseModel):
    job_id: str
    subject_line: str = ""
    body: str = ""

class EmailType(str):
    cold = "cold"
    referral = "referral"
    followup = "followup"
    thankyou = "thankyou"

class GenerateEmailRequest(BaseModel):
    job_id: str
    email_type: str  # cold | referral | followup | thankyou

class GenerateEmailResponse(BaseModel):
    job_id: str
    email_type: str
    subject: str = ""
    body: str = ""

# ─── Phase 6: Application Tracker ──────────────────────────────────────────────

class ApplicationCreate(BaseModel):
    company: str
    position: str
    job_id: Optional[str] = None
    match_percent: Optional[float] = None
    status: str = "applied"  # applied | interview | rejected | offer | follow_up
    applied_date: Optional[str] = None
    notes: Optional[str] = None

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    match_percent: Optional[float] = None
    applied_date: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: str
    company: str
    position: str
    job_id: Optional[str] = None
    match_percent: Optional[float] = None
    status: str
    applied_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# ─── Phase 7: Daily Matching Cron / Scheduler ──────────────────────────────────

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    job_id: Optional[str] = None
    match_percent: Optional[float] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class SchedulerSettingsResponse(BaseModel):
    keywords: str
    location: str
    remote_only: bool
    match_threshold: float
    interval_hours: float
    last_run: Optional[datetime] = None
    is_enabled: bool

    class Config:
        from_attributes = True

class SchedulerSettingsUpdate(BaseModel):
    keywords: Optional[str] = None
    location: Optional[str] = None
    remote_only: Optional[bool] = None
    match_threshold: Optional[float] = None
    interval_hours: Optional[float] = None
    is_enabled: Optional[bool] = None

