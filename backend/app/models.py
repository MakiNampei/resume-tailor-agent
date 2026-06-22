import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from .database import Base

class ExperienceBlock(Base):
    __tablename__ = "experience_blocks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    organization = Column(String, nullable=False)
    location = Column(String, nullable=True)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)  # e.g., "August 2025" or "Present"
    description_bullets = Column(Text, nullable=False)  # JSON-encoded list of strings
    category = Column(String, nullable=False, default="work")  # "work", "project", "education", "leadership"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class TailoredResume(Base):
    __tablename__ = "tailored_resumes"

    id = Column(Integer, primary_key=True, index=True)
    job_title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    job_description = Column(Text, nullable=False)
    extracted_requirements = Column(Text, nullable=True)  # JSON-encoded dict
    selected_blocks = Column(Text, nullable=True)  # JSON-encoded list of dicts (with tailored bullets)
    personal_info = Column(Text, nullable=True)  # JSON-encoded dict (name, contact info)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
