import datetime
from sqlalchemy import Column, String, Text, DateTime, Boolean, Float, Integer
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(String, primary_key=True, index=True)
    raw_resume_text = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)          # JSON array of strings
    projects = Column(Text, nullable=True)        # JSON array of dicts
    education = Column(Text, nullable=True)       # JSON array of dicts
    experience = Column(Text, nullable=True)      # JSON array of dicts
    certifications = Column(Text, nullable=True)  # JSON array of strings
    links = Column(Text, nullable=True)           # JSON dict of links
    resume_filename = Column(String, nullable=True)
    resume_filepath = Column(String, nullable=True)
    confidence_json = Column(Text, nullable=True)  # Feature 3: per-field confidence scores (JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(String, nullable=True, index=True)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    source = Column(String, nullable=True)
    title = Column(String, nullable=True)
    company = Column(String, nullable=True)
    location = Column(String, nullable=True)
    remote = Column(Boolean, default=False)
    salary_range = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    apply_url = Column(String, nullable=True)
    experience_level = Column(String, default="unspecified")
    fetched_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(String, nullable=True, index=True)

class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, index=True)
    job_id = Column(String, nullable=True)
    company = Column(String, nullable=True)
    position = Column(String, nullable=True)
    match_percent = Column(Float, nullable=True)
    status = Column(String, default="applied")  # applied | interview | offer | rejected | withdrawn
    applied_date = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(String, nullable=True, index=True)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=True)
    message = Column(Text, nullable=True)
    job_id = Column(String, nullable=True)
    match_percent = Column(Float, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(String, nullable=True, index=True)

class InterviewPrep(Base):
    __tablename__ = "interview_prep"

    id = Column(String, primary_key=True, index=True)
    job_id = Column(String, nullable=False, index=True, unique=True)
    result_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(String, nullable=True, index=True)


class ResumeVariants(Base):
    __tablename__ = "resume_variants"

    id = Column(String, primary_key=True, index=True)
    profile_id = Column(String, nullable=False, index=True, unique=True)
    variants_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(String, nullable=True, index=True)


class SentEmail(Base):
    __tablename__ = "sent_emails"

    id = Column(String, primary_key=True, index=True)
    job_id = Column(String, nullable=False, index=True)
    to_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)
    attachment_name = Column(String, nullable=True)
    status = Column(String, default="sent")
    gmail_message_id = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    user_id = Column(String, nullable=True, index=True)


class SchedulerSettings(Base):
    __tablename__ = "scheduler_settings"

    id = Column(String, primary_key=True, index=True)
    keywords = Column(String, default="Python, React, Software Engineer")
    location = Column(String, default="India")
    remote_only = Column(Boolean, default=False)
    match_threshold = Column(Float, default=70.0)
    interval_hours = Column(Float, default=24.0)
    experience_level = Column(String, default="any")
    last_run = Column(DateTime, nullable=True)
    is_enabled = Column(Boolean, default=True)
    user_id = Column(String, nullable=True, index=True)


# ── Feature 2: Job Match Analysis Cache ──────────────────────────────────────────
class JobMatchCache(Base):
    __tablename__ = "job_match_cache"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    job_id = Column(String, nullable=False, index=True)
    profile_id = Column(String, nullable=False, index=True)  # resume version key
    result_json = Column(Text, nullable=False)               # full analysis JSON
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ── Feature 6: Saved / Dismissed Jobs ────────────────────────────────────────────
class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    job_id = Column(String, nullable=False, index=True)
    saved_at = Column(DateTime, default=datetime.datetime.utcnow)


class DismissedJob(Base):
    __tablename__ = "dismissed_jobs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    job_id = Column(String, nullable=False, index=True)
    dismissed_at = Column(DateTime, default=datetime.datetime.utcnow)
