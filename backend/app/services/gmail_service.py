import os
import json
import base64
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from app.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
from app.services.mistral_service import MistralService

class GmailService:
    @staticmethod
    def _get_token_path() -> str:
        # Save gmail_token.json in backend directory
        return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "gmail_token.json")

    @classmethod
    def get_auth_url(cls) -> str:
        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
            raise ValueError("Google Client ID or Client Secret not configured. Please add them to backend/.env.")
        
        client_config = {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_REDIRECT_URI]
            }
        }
        flow = Flow.from_client_config(
            client_config,
            scopes=["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/userinfo.email"]
        )
        # offline access is needed to retrieve refresh token
        auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline')
        return auth_url

    @classmethod
    def save_credentials(cls, code: str):
        client_config = {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_REDIRECT_URI]
            }
        }
        flow = Flow.from_client_config(
            client_config,
            scopes=["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/userinfo.email"]
        )
        flow.fetch_token(code=code)
        credentials = flow.credentials
        token_path = cls._get_token_path()
        with open(token_path, "w") as f:
            f.write(credentials.to_json())

    @classmethod
    def get_credentials(cls) -> Credentials:
        token_path = cls._get_token_path()
        if not os.path.exists(token_path):
            return None
        try:
            with open(token_path, "r") as f:
                info = json.load(f)
            credentials = Credentials.from_authorized_user_info(info)
            if credentials and credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
                with open(token_path, "w") as f:
                    f.write(credentials.to_json())
            return credentials
        except Exception as e:
            print(f"Error loading/refreshing credentials: {str(e)}")
            return None

    @classmethod
    def get_profile_email(cls) -> str:
        credentials = cls.get_credentials()
        if not credentials:
            return None
        try:
            service = build('gmail', 'v1', credentials=credentials)
            profile = service.users().getProfile(userId='me').execute()
            return profile.get('emailAddress')
        except Exception as e:
            print(f"Error fetching profile email: {str(e)}")
            return None

    @classmethod
    def disconnect(cls):
        token_path = cls._get_token_path()
        if os.path.exists(token_path):
            os.remove(token_path)

    @classmethod
    def extract_contact_emails(cls, job_description: str, apply_url: str) -> list:
        emails_found = []
        
        # 1. Check mailto link in apply url
        if apply_url and apply_url.lower().startswith("mailto:"):
            email = apply_url[7:].split("?")[0].strip()
            if email and email not in emails_found:
                emails_found.append(email)

        # 2. Run regex check on job description
        email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
        emails = re.findall(email_pattern, job_description)
        if emails:
            # Filter out common false positives
            filtered = [e for e in emails if not any(x in e.lower() for x in ["example.com", "test.com", "domain.com", "yourname"])]
            for e in (filtered or emails):
                if e not in emails_found:
                    emails_found.append(e)

        # 3. Fallback to Mistral LLM call only if none found by regex
        if not emails_found:
            prompt = f"""\
Identify any contact email addresses mentioned in the job description below.
If no contact email address is mentioned or implied, return empty list.

Return ONLY a valid JSON object matching this exact schema:
{{
  "emails": ["email_address"]
}}

Job Description:
{job_description[:2000]}
"""
            try:
                messages = [
                    {"role": "system", "content": "You are a helpful data extraction assistant. Reply with valid JSON only."},
                    {"role": "user", "content": prompt}
                ]
                response_text = MistralService.chat_complete(messages, response_format={"type": "json_object"})
                data = json.loads(response_text)
                for email in data.get("emails", []):
                    if email and email not in emails_found:
                        emails_found.append(email)
            except Exception as e:
                print(f"Failed to extract contact emails via Mistral: {str(e)}")

        return emails_found

    @classmethod
    def extract_contact_email(cls, job_description: str, apply_url: str) -> str:
        emails = cls.extract_contact_emails(job_description, apply_url)
        return emails[0] if emails else None

    @classmethod
    def send_email(cls, to: str, subject: str, body: str, attachment_path: str = None):
        credentials = cls.get_credentials()
        if not credentials:
            raise ValueError("Gmail account not connected. Please connect it first.")

        service = build('gmail', 'v1', credentials=credentials)

        message = MIMEMultipart()
        message['to'] = to
        message['subject'] = subject

        # Add message body
        message.attach(MIMEText(body, 'plain'))

        # Add attachment
        if attachment_path and os.path.exists(attachment_path):
            filename = os.path.basename(attachment_path)
            # Determine standard MIME type mapping
            ext = os.path.splitext(filename)[1].lower()
            
            with open(attachment_path, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())
            
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f"attachment; filename={filename}",
            )
            message.attach(part)

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {'raw': raw_message}
        
        return service.users().messages().send(userId="me", body=create_message).execute()
