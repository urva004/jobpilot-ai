import datetime
from sqlalchemy import Column, String, Text, DateTime, Boolean, Float
from app.database import Base

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
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

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
    fetched_at = Column(DateTime, default=datetime.datetime.utcnow)

class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, index=True)
    job_id = Column(String, nullable=True)
    company = Column(String, nullable=True)
    position = Column(String, nullable=True)
    match_percent = Column(Float, nullable=True)
    status = Column(String, default="applied")  # applied | interview | rejected | offer | follow_up
    applied_date = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=True)
    message = Column(Text, nullable=True)
    job_id = Column(String, nullable=True)  # Link to the matched job if applicable
    match_percent = Column(Float, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SchedulerSettings(Base):
    __tablename__ = "scheduler_settings"

    id = Column(String, primary_key=True, index=True)  # Single row, e.g. "default"
    keywords = Column(String, default="Python, React, Software Engineer")
    location = Column(String, default="India")
    remote_only = Column(Boolean, default=False)
    match_threshold = Column(Float, default=70.0)
    interval_hours = Column(Float, default=24.0)
    last_run = Column(DateTime, nullable=True)
    is_enabled = Column(Boolean, default=True)

