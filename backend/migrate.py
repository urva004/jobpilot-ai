"""
One-time migration script: adds new columns/tables to the existing SQLite DB
without dropping any existing data.

Run from the backend directory:
    .venv\Scripts\python.exe migrate.py
"""
import sqlite3
import os

# Find the DB file
DB_CANDIDATES = ["jobpilot.db", "app.db", "database.db", "db.sqlite3", "sqlite.db"]
db_path = None
for name in DB_CANDIDATES:
    if os.path.exists(name):
        db_path = name
        break

if not db_path:
    # Search recursively one level
    for f in os.listdir("."):
        if f.endswith(".db") or f.endswith(".sqlite") or f.endswith(".sqlite3"):
            db_path = f
            break

if not db_path:
    print("ERROR: Could not locate SQLite database file. Searched:", DB_CANDIDATES)
    exit(1)

print(f"[migrate] Using database: {os.path.abspath(db_path)}")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# ── Inspect current state ──────────────────────────────────────────────────────
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
existing_tables = {row[0] for row in cur.fetchall()}
print(f"[migrate] Existing tables: {sorted(existing_tables)}")

def get_columns(table):
    cur.execute(f"PRAGMA table_info({table})")
    return {row[1] for row in cur.fetchall()}

# ── 1. candidate_profiles: add confidence_json (Feature 3) ───────────────────
if "candidate_profiles" in existing_tables:
    cols = get_columns("candidate_profiles")
    if "confidence_json" not in cols:
        cur.execute("ALTER TABLE candidate_profiles ADD COLUMN confidence_json TEXT")
        print("[migrate] [OK] Added candidate_profiles.confidence_json")
    else:
        print("[migrate] - candidate_profiles.confidence_json already exists")

# ── 2. Create job_match_cache (Feature 2) ────────────────────────────────────
if "job_match_cache" not in existing_tables:
    cur.execute("""
        CREATE TABLE job_match_cache (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            profile_id TEXT NOT NULL,
            result_json TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS ix_jmc_user ON job_match_cache (user_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_jmc_job ON job_match_cache (job_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_jmc_profile ON job_match_cache (profile_id)")
    print("[migrate] [OK] Created job_match_cache table")
else:
    print("[migrate] - job_match_cache already exists")

# ── 3. Create saved_jobs (Feature 6) ─────────────────────────────────────────
if "saved_jobs" not in existing_tables:
    cur.execute("""
        CREATE TABLE saved_jobs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS ix_sj_user ON saved_jobs (user_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_sj_job ON saved_jobs (job_id)")
    print("[migrate] [OK] Created saved_jobs table")
else:
    print("[migrate] - saved_jobs already exists")

# ── 4. Create dismissed_jobs (Feature 6) ─────────────────────────────────────
if "dismissed_jobs" not in existing_tables:
    cur.execute("""
        CREATE TABLE dismissed_jobs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            dismissed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS ix_dj_user ON dismissed_jobs (user_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_dj_job ON dismissed_jobs (job_id)")
    print("[migrate] [OK] Created dismissed_jobs table")
else:
    print("[migrate] - dismissed_jobs already exists")

conn.commit()
conn.close()
print("[migrate] [SUCCESS] Migration complete — all columns and tables are up to date.")

