import asyncio
import datetime
import uuid
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import CandidateProfile, Job, Notification, SchedulerSettings, SentEmail
from app.services.job_service import JobService
from app.services.chroma_service import ChromaService
from app.services.mistral_service import MistralService

class SchedulerService:
    @staticmethod
    def get_or_create_settings(db: Session, user_id: str = "default") -> SchedulerSettings:
        settings = db.query(SchedulerSettings).filter(SchedulerSettings.user_id == user_id).first()
        if not settings:
            settings = SchedulerSettings(
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
            db.add(settings)
            try:
                db.commit()
                db.refresh(settings)
            except Exception:
                db.rollback()
        return settings

    @classmethod
    def run_matching_cycle(cls, db: Session, user_id: str = "default") -> dict:
        """Runs the search + semantic matching + notification generation process for a specific user."""
        settings = cls.get_or_create_settings(db, user_id)
        profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).order_by(CandidateProfile.created_at.desc()).first()
        if not profile:
            return {"status": "skipped", "reason": "No candidate profile found. Please upload a resume first."}

        # Split keywords
        kw_list = [k.strip() for k in settings.keywords.split(",") if k.strip()]
        if not kw_list:
            return {"status": "skipped", "reason": "No keywords configured for scheduler."}

        new_jobs_found = 0
        new_matches_found = 0
        notifications_created = []

        # Get resume embedding (cached if possible)
        resume_vec_id = f"resume_{profile.id}"
        resume_vector = ChromaService.get_vector(resume_vec_id)
        if not resume_vector:
            resume_text = profile.raw_resume_text or ""
            resume_vector = MistralService.get_embeddings([resume_text])[0]
            ChromaService.upsert_vector(resume_vec_id, resume_vector, {"type": "resume", "profile_id": profile.id})

        # Fetch and process for each keyword
        for kw in kw_list:
            try:
                # search_and_save will search both APIs (or use mock fallbacks if offline/empty)
                jobs = JobService.search_and_save(db, kw, settings.location, settings.remote_only)
                new_jobs_found += len(jobs)

                # Filter by experience level if configured
                exp_filter = getattr(settings, 'experience_level', 'any')
                if exp_filter and exp_filter != 'any':
                    jobs = [j for j in jobs if j.experience_level == exp_filter]

                for job in jobs:
                    # Check if match was already calculated/stored or if we need to compute similarity
                    job_vec_id = f"job_{job.id}"
                    job_vector = ChromaService.get_vector(job_vec_id)
                    if not job_vector:
                        job_text = f"{job.title}\n{job.company}\n{job.description}"
                        job_vector = MistralService.get_embeddings([job_text])[0]
                        ChromaService.upsert_vector(job_vec_id, job_vector, {"type": "job", "job_id": job.id})

                    # Compute cosine similarity
                    similarity = ChromaService.compute_cosine_similarity(resume_vector, job_vector)
                    
                    # Scaling similarity
                    min_val, max_val = 0.3, 0.8
                    if similarity <= min_val:
                        match_percent = float(round(similarity * 100, 1))
                    else:
                        scaled = 30 + ((similarity - min_val) / (max_val - min_val)) * 68
                        match_percent = float(round(min(100.0, max(0.0, scaled)), 1))

                    # If above threshold, check if we should notify
                    if match_percent >= settings.match_threshold:
                        new_matches_found += 1
                        
                        # Check if notification already exists for this job and user
                        existing = db.query(Notification).filter(
                            Notification.job_id == job.id,
                            Notification.user_id == user_id
                        ).first()
                        if not existing:
                            notif = Notification(
                                id=str(uuid.uuid4()),
                                title=f"New High-Match Job Found: {job.title}",
                                message=f"A job post from {job.company} matching your profile has been discovered. Match score: {match_percent}%.",
                                job_id=job.id,
                                match_percent=match_percent,
                                is_read=False,
                                created_at=datetime.datetime.utcnow(),
                                user_id=user_id
                            )
                            db.add(notif)
                            notifications_created.append({
                                "title": notif.title,
                                "company": job.company,
                                "match": match_percent
                            })
            except Exception as e:
                print(f"Error processing keyword '{kw}' in scheduler: {str(e)}")

        # Check follow-up reminders
        try:
            cls.generate_followup_notifications(db, user_id)
        except Exception as followup_err:
            print(f"Error triggering followup notifications: {followup_err}")

        settings.last_run = datetime.datetime.utcnow()
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Error saving scheduler settings/notifications to database: {str(e)}")

        return {
            "status": "success",
            "jobs_scanned": new_jobs_found,
            "high_matches_found": new_matches_found,
            "notifications_created": notifications_created
        }

    @classmethod
    def generate_followup_notifications(cls, db: Session, user_id: str = "default"):
        """Checks for applications sent via email that have been 'applied' for > 7 days, and issues a follow-up notification."""
        try:
            import datetime
            seven_days_ago = datetime.date.today() - datetime.timedelta(days=7)
            seven_days_ago_str = seven_days_ago.isoformat()
            
            # Find applications where status is 'applied' and user_id matches
            old_apps = db.query(Application).filter(
                Application.status == "applied",
                Application.applied_date != None,
                Application.applied_date <= seven_days_ago_str,
                Application.user_id == user_id
            ).all()
            
            for app in old_apps:
                # Check if a follow-up notification already exists for this job
                notif_title = f"Follow-Up Reminder: {app.company}"
                existing = db.query(Notification).filter(
                    Notification.job_id == app.job_id,
                    Notification.user_id == user_id,
                    Notification.title.like("Follow-Up Reminder%")
                ).first()
                
                if not existing:
                    # Verify if this was sent via email (exists in SentEmail table)
                    email_sent = db.query(SentEmail).filter(
                        SentEmail.job_id == app.job_id,
                        SentEmail.user_id == user_id
                    ).first()
                    if email_sent:
                        notif = Notification(
                            id=str(uuid.uuid4()),
                            title=notif_title,
                            message=f"It has been over 7 days since you applied to {app.company} for the {app.position} position. Consider sending a polite follow-up email.",
                            job_id=app.job_id,
                            match_percent=app.match_percent or 0.0,
                            is_read=False,
                            created_at=datetime.datetime.utcnow(),
                            user_id=user_id
                        )
                        db.add(notif)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Error generating follow-up notifications: {str(e)}")

# Background thread runner
async def start_scheduler_loop():
    """An infinite async loop that periodically runs the matching cycle if enabled."""
    print("Initializing JobPilot AI background scheduler...")
    while True:
        # Run every 60 seconds to check settings & time elapsed
        await asyncio.sleep(60)
        
        db = SessionLocal()
        try:
            # Get all active user scheduler settings
            settings_list = db.query(SchedulerSettings).filter(SchedulerSettings.is_enabled == True).all()
            for settings in settings_list:
                # Check if interval has elapsed
                now = datetime.datetime.utcnow()
                should_run = False
                if not settings.last_run:
                    should_run = True
                else:
                    elapsed = now - settings.last_run
                    if elapsed >= datetime.timedelta(hours=settings.interval_hours):
                        should_run = True

                if should_run:
                    print(f"Background Scheduler: Starting matching cycle for user {settings.user_id} with keywords: {settings.keywords}")
                    result = SchedulerService.run_matching_cycle(db, user_id=settings.user_id)
                    print(f"Background Scheduler: Match run finished: {result}")
        except Exception as e:
            print(f"Error in scheduler background loop: {str(e)}")
        finally:
            db.close()
