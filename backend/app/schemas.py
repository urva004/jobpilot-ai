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

# ── Feature 3: Confidence Scores ─────────────────────────────────────────────
class ConfidenceScores(BaseModel):
    skills: float = 0.0
    experience: float = 0.0
    education: float = 0.0
    overall: float = 0.0

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
    resume_filename: Optional[str] = None
    resume_filepath: Optional[str] = None
    confidence: Optional[ConfidenceScores] = None   # Feature 3: nullable, backward-compatible
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
    has_contact_email: bool = False
    experience_level: str = "unspecified"
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
    cached: bool = False   # Feature 2: indicates if result came from cache

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
VALID_APP_STATUSES = {"applied", "interview", "offer", "rejected", "withdrawn", "follow_up"}

class ApplicationCreate(BaseModel):
    company: str
    position: str
    job_id: Optional[str] = None
    match_percent: Optional[float] = None
    status: str = "applied"
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
    apply_url: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None

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
    experience_level: str = "any"
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
    experience_level: Optional[str] = None
    is_enabled: Optional[bool] = None


# ─── Phase 8: Interview Prep Generator ───────────────────────────────────────
class TechnicalQuestion(BaseModel):
    question: str
    tip: str
    sample_answer: Optional[str] = None

class CodingQuestion(BaseModel):
    question: str
    difficulty: str
    hint: str
    approach_explanation: Optional[str] = None
    solution_code: Optional[str] = None
    solution_language: Optional[str] = None

class SystemDesignQuestion(BaseModel):
    question: str
    focus_areas: List[str] = []
    sample_answer: Optional[str] = None

class HRQuestion(BaseModel):
    question: str
    tip: str
    sample_answer: Optional[str] = None

class BehavioralQuestion(BaseModel):
    question: str
    framework_tip: str
    sample_answer: Optional[str] = None

class InterviewPrepRequest(BaseModel):
    job_id: str

class InterviewPrepResponse(BaseModel):
    job_id: str
    technical_questions: List[TechnicalQuestion] = []
    coding_questions: List[CodingQuestion] = []
    system_design_questions: List[SystemDesignQuestion] = []
    hr_questions: List[HRQuestion] = []
    behavioral_questions: List[BehavioralQuestion] = []


# ─── Phase 9: Resume Variants (A/B/C) ────────────────────────────────────────
class ExperienceBullets(BaseModel):
    original_role: str
    bullets: List[str] = []

class ResumeVariant(BaseModel):
    variant: str
    professional_summary: str
    reordered_skills: List[str] = []
    reworded_experience_bullets: List[ExperienceBullets] = []
    highlighted_projects: List[str] = []

class ResumeVariantsRequest(BaseModel):
    profile_id: Optional[str] = None

class ResumeVariantsResponse(BaseModel):
    profile_id: str
    variants: List[ResumeVariant] = []


# ─── Phase 10: Automated Email Job Application ───────────────────────────────
class GmailStatusResponse(BaseModel):
    connected: bool
    email: Optional[str] = None

class EmailDraftResponse(BaseModel):
    to_email: str
    subject: str
    body: str
    attachment_name: Optional[str] = None
    has_contact_email: bool
    contact_emails: List[str] = []
    suggested_variant: Optional[str] = None

class EmailSendRequest(BaseModel):
    to_email: str
    subject: str
    body: str
    variant: Optional[str] = None

# ─── Auth Schemas ─────────────────────────────────────────────────────────────
class UserSignup(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_email: str

class UserResponse(BaseModel):
    id: str
    email: str
    is_verified: bool

    class Config:
        from_attributes = True

class VerifyEmailRequest(BaseModel):
    email: str
    otp: str

class ResendOtpRequest(BaseModel):
    email: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

# ─── Feature 6: Saved/Dismissed Job Schemas ──────────────────────────────────
class SavedJobResponse(BaseModel):
    id: str
    job_id: str
    saved_at: datetime
    # Enriched job fields
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    remote: Optional[bool] = None
    apply_url: Optional[str] = None
    experience_level: Optional[str] = None

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}

class DismissedJobResponse(BaseModel):
    job_id: str
    dismissed_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}
