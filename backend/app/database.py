from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import DATABASE_URL

connect_args = {}
engine_kwargs = {}

if DATABASE_URL.startswith("sqlite"):
    # SQLite: needed for FastAPI's multi-threaded request handling
    connect_args = {"check_same_thread": False}
elif DATABASE_URL.startswith("postgresql") or DATABASE_URL.startswith("postgres"):
    # PostgreSQL (Neon / any cloud PG): pool_pre_ping reconnects after idle timeouts
    # which is critical for serverless databases that drop connections.
    engine_kwargs = {"pool_pre_ping": True, "pool_recycle": 300}

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
