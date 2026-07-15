"""
Feature 5: In-memory per-user rate limiter + request logging.

Rate limits (sliding window per user_id):
  - Mistral-heavy endpoints  (/jobs/match, /ats/score, /resume/tailor, etc.): 10 req/min
  - Job search endpoints     (/jobs/search): 5 req/min
  - Resume upload            (/resume/upload): 5 req/min

Counters reset on server restart (acceptable for MVP — no Redis needed).
"""

import time
import logging
from collections import defaultdict
from fastapi import HTTPException

# Set up structured request logger
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
)
request_logger = logging.getLogger("jobpilot.requests")


# ── In-memory sliding window store ────────────────────────────────────────────
# Structure: {(user_id, endpoint): [timestamp1, timestamp2, ...]}
_rate_store: dict[tuple, list[float]] = defaultdict(list)


def _check_rate_limit(user_id: str, endpoint: str, max_requests: int, window_seconds: int = 60):
    """
    Sliding-window rate limiter. Raises HTTP 429 if the user has exceeded
    max_requests within the last window_seconds for the given endpoint.
    """
    key = (user_id, endpoint)
    now = time.monotonic()
    cutoff = now - window_seconds

    # Evict timestamps outside the window
    _rate_store[key] = [t for t in _rate_store[key] if t > cutoff]

    if len(_rate_store[key]) >= max_requests:
        retry_after = int(window_seconds - (now - _rate_store[key][0]))
        request_logger.warning(
            f"RATE_LIMIT user={user_id[:8]} endpoint={endpoint} "
            f"count={len(_rate_store[key])}/{max_requests} retry_after={retry_after}s"
        )
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: max {max_requests} requests per {window_seconds}s on {endpoint}. "
                   f"Retry after ~{retry_after}s."
        )

    _rate_store[key].append(now)


def log_request(user_id: str, endpoint: str, extra: str = ""):
    """Log an incoming API request to the structured logger."""
    request_logger.info(f"REQUEST user={user_id[:8]} endpoint={endpoint} {extra}".strip())


# ── Convenience rate-limit wrappers (pre-configured per endpoint type) ────────

def rate_limit_mistral(user_id: str, endpoint: str):
    """10 Mistral calls per minute per user."""
    log_request(user_id, endpoint, "type=mistral")
    _check_rate_limit(user_id, endpoint, max_requests=10, window_seconds=60)


def rate_limit_search(user_id: str, endpoint: str):
    """5 search calls per minute per user (Adzuna/JSearch quota protection)."""
    log_request(user_id, endpoint, "type=search")
    _check_rate_limit(user_id, endpoint, max_requests=5, window_seconds=60)


def rate_limit_upload(user_id: str, endpoint: str):
    """5 resume uploads per minute per user."""
    log_request(user_id, endpoint, "type=upload")
    _check_rate_limit(user_id, endpoint, max_requests=5, window_seconds=60)
