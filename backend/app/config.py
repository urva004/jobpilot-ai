import os
from dotenv import load_dotenv

# Load env file from parent folder (backend/.env)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./jobpilot.db")
ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/gmail/callback")

# JWT Auth
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jobpilot-ai-fallback-secret-key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# SMTP Email (for OTP delivery)
SMTP_EMAIL    = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))

# Resend API (for transactional emails on Render Free Tier)
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")

# Environment and Email Mocking Safety Gate
ENV = os.getenv("ENV", "production").lower()
MOCK_EMAIL_RAW = os.getenv("MOCK_EMAIL") == "true"
MOCK_EMAIL = False

if MOCK_EMAIL_RAW:
    if ENV in ["test", "dev", "development"]:
        MOCK_EMAIL = True
    else:
        import logging
        logging.basicConfig(level=logging.INFO)
        logger = logging.getLogger("jobpilot")
        logger.warning(
            "CRITICAL SECURITY WARNING: MOCK_EMAIL is set to true, but ENV is set to '%s'. "
            "Forcing MOCK_EMAIL to False to prevent accidental email bypass in production!",
            ENV
        )
