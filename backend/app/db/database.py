from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_session_factory() -> sessionmaker[Session]:
    """Return the session factory for work that outlives the request scope.

    Streaming responses run after FastAPI has torn down ``get_db``'s session, so they open
    their own session from this factory. Tests override it to point at their database.
    """
    return SessionLocal
