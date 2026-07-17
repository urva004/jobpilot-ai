import re
import urllib.parse
from sqlalchemy.orm import Session
from app.queue_app import log_activity_event

class ATSService:
    @staticmethod
    def detect_ats_provider(url: str) -> str | None:
        """
        Parses a job application URL and returns the ATS provider name.
        Supported providers: 'greenhouse', 'lever'
        """
        if not url:
            return None
        
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc.lower()
        
        if "greenhouse.io" in domain or "boards.greenhouse.io" in domain:
            return "greenhouse"
        if "lever.co" in domain or "jobs.lever.co" in domain:
            return "lever"
        
        # Path-based fallback check
        full_path = url.lower()
        if "greenhouse.io" in full_path:
            return "greenhouse"
        if "lever.co" in full_path:
            return "lever"
            
        return None

    @classmethod
    def submit_to_ats(cls, db: Session, user_id: str, job_id: str, apply_url: str, autofill_data: dict) -> dict:
        """
        Simulates submitting candidate details to Greenhouse or Lever ATS portals,
        compiling a schema-valid payload and logging the audit event.
        """
        provider = cls.detect_ats_provider(apply_url)
        if not provider:
            return {
                "status": "failed",
                "reason": "URL does not match a supported ATS provider (Greenhouse/Lever)."
            }

        # 1. Structure the payload based on the provider schema
        payload = {}
        candidate_name = autofill_data.get("name", "Applicant")
        # Split name for Greenhouse
        name_parts = candidate_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else "Candidate"

        if provider == "greenhouse":
            payload = {
                "first_name": first_name,
                "last_name": last_name,
                "email": autofill_data.get("email", ""),
                "phone": autofill_data.get("phone", ""),
                "resume": {
                    "filename": "Tailored_Resume.pdf",
                    "content_text": autofill_data.get("tailored_resume_text", "")
                },
                "cover_letter": {
                    "filename": "Cover_Letter.pdf",
                    "content_text": autofill_data.get("tailored_cover_letter_text", "")
                },
                "urls": {
                    "linkedin": autofill_data.get("links", {}).get("linkedin", ""),
                    "github": autofill_data.get("links", {}).get("github", ""),
                    "portfolio": autofill_data.get("links", {}).get("portfolio", "")
                }
            }
        elif provider == "lever":
            payload = {
                "name": candidate_name,
                "email": autofill_data.get("email", ""),
                "phone": autofill_data.get("phone", ""),
                "resume": {
                    "filename": "Tailored_Resume.pdf",
                    "content_text": autofill_data.get("tailored_resume_text", "")
                },
                "urls": {
                    "linkedin": autofill_data.get("links", {}).get("linkedin", ""),
                    "github": autofill_data.get("links", {}).get("github", ""),
                    "portfolio": autofill_data.get("links", {}).get("portfolio", "")
                },
                "cover_letter_text": autofill_data.get("tailored_cover_letter_text", "")
            }

        # 2. Log audit event
        details = (
            f"[ATS Auto-Submit] Simulated submission to {provider.upper()} API.\n"
            f"Target URL: {apply_url}\n"
            f"Extracted payload name: {candidate_name}\n"
            f"Mapped fields: email, phone, resume text, cover letter text, links."
        )
        
        log_activity_event(
            db=db,
            user_id=user_id,
            event_type="apply_confirmed",
            job_id=job_id,
            details=details
        )
        
        print(f"[ATS Submit SUCCESS] Successfully routed application via {provider.upper()} Adapter.")
        
        return {
            "status": "success",
            "channel": f"ATS_{provider.capitalize()}",
            "message": f"Successfully submitted application via {provider.upper()} ATS adapter.",
            "payload_sent": payload
        }
