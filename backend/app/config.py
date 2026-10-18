import os
import logging
from dotenv import load_dotenv

# Load env file from parent folder (backend/.env)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

logger = logging.getLogger("jobpilot.config")

# ── Secret Masking Utility ──────────────────────────────────────────────
def mask_secret(value: str | None, visible_chars: int = 4) -> str:
    """Return a masked version of a secret for safe logging.

    Shows the first `visible_chars` characters, replaces the rest with '*'.
    Returns '<not-set>' if value is None or empty.
    """
    if not value:
        return "<not-set>"
    if len(value) <= visible_chars + 4:
        return value[:1] + "***"
    return value[:visible_chars] + "***"

# ── Configuration Values ────────────────────────────────────────────────

MISTRAL_API_KEY = (os.getenv("MISTRAL_API_KEY") or "").strip() or None
MISTRAL_MODEL = os.getenv("MISTRAL_MODEL", "ministral-8b-latest")
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

# Scraper Configuration
SCRAPER_INTERVAL_MINUTES = int(os.getenv("SCRAPER_INTERVAL_MINUTES", "30"))

# Optional centralized Redis cache (fail-open when disabled/unavailable)
REDIS_ENABLED = os.getenv("REDIS_ENABLED", "false").lower() == "true"
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CACHE_JOB_SEARCH_TTL_SECONDS = int(os.getenv("CACHE_JOB_SEARCH_TTL_SECONDS", "300"))
CACHE_JOB_DETAIL_TTL_SECONDS = int(os.getenv("CACHE_JOB_DETAIL_TTL_SECONDS", "1800"))
CACHE_MATCH_TTL_SECONDS = int(os.getenv("CACHE_MATCH_TTL_SECONDS", "3600"))
CACHE_ATS_TTL_SECONDS = int(os.getenv("CACHE_ATS_TTL_SECONDS", "3600"))

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
        logger.warning(
            "CRITICAL SECURITY WARNING: MOCK_EMAIL is set to true, but ENV is set to '%s'. "
            "Forcing MOCK_EMAIL to False to prevent accidental email bypass in production!",
            ENV
        )

# CORS Configuration
_raw_cors = os.getenv("CORS_ORIGINS") or os.getenv("FRONTEND_URL", "*")
if _raw_cors.strip() == "*":
    CORS_ORIGINS = ["*"]
else:
    CORS_ORIGINS = [orig.strip() for orig in _raw_cors.split(",") if orig.strip()]

# ── Startup Validation ──────────────────────────────────────────────────

REQUIRED_PRODUCTION_SECRETS = {
    "MISTRAL_API_KEY": MISTRAL_API_KEY,
    "JWT_SECRET_KEY": JWT_SECRET_KEY,
}

def validate_config() -> list[str]:
    """Check that all required secrets are set in production mode.
    Returns a list of missing/invalid variable names (empty if all good).
    """
    missing: list[str] = []
    for name, value in REQUIRED_PRODUCTION_SECRETS.items():
        if not value or value == "change-me-in-production":
            missing.append(name)

    if ENV not in ("dev", "development", "test"):
        if JWT_SECRET_KEY == "jobpilot-ai-fallback-secret-key":
            missing.append("JWT_SECRET_KEY (using default fallback in production is insecure!)")

    # Additional checks when email features are enabled
    if SMTP_EMAIL and not SMTP_PASSWORD:
        missing.append("SMTP_PASSWORD (set because SMTP_EMAIL is configured)")

    return missing


def log_config_status() -> None:
    """Log a summary of which secrets are configured (without revealing values)."""
    all_secrets = {
        "MISTRAL_API_KEY": MISTRAL_API_KEY,
        "DATABASE_URL": DATABASE_URL,
        "ADZUNA_APP_ID": ADZUNA_APP_ID,
        "ADZUNA_APP_KEY": ADZUNA_APP_KEY,
        "RAPIDAPI_KEY": RAPIDAPI_KEY,
        "GOOGLE_CLIENT_ID": GOOGLE_CLIENT_ID,
        "GOOGLE_CLIENT_SECRET": GOOGLE_CLIENT_SECRET,
        "JWT_SECRET_KEY": JWT_SECRET_KEY,
        "SMTP_EMAIL": SMTP_EMAIL,
        "RESEND_API_KEY": RESEND_API_KEY,
        "REDIS_URL": REDIS_URL if REDIS_ENABLED else "<disabled>",
    }
    logger.info("Environment: %s", ENV)
    for name, value in all_secrets.items():
        status = mask_secret(value) if name not in ("DATABASE_URL", "ENV") else (value or "<not-set>")
        logger.info("  %s = %s", name, status)

    missing = validate_config()
    if missing:
        logger.warning(
            "Missing or invalid secrets: %s. The application may not function correctly.",
            ", ".join(missing)
        )
