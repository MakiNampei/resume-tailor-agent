from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Experience Block Schemas ---
class ExperienceBlockBase(BaseModel):
    title: str
    organization: str
    location: Optional[str] = None
    start_date: str
    end_date: str
    description_bullets: List[str] = Field(default_factory=list)
    category: str = "work" # "work", "project", "education", "leadership"

class ExperienceBlockCreate(ExperienceBlockBase):
    pass

class ExperienceBlockUpdate(BaseModel):
    title: Optional[str] = None
    organization: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description_bullets: Optional[List[str]] = None
    category: Optional[str] = None

class ExperienceBlockResponse(ExperienceBlockBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Tailoring Wizard Schemas ---
class JobDescriptionInput(BaseModel):
    job_title: str
    company: str
    job_description: str

class ExtractedRequirementsResponse(BaseModel):
    skills: Dict[str, List[str]] = Field(default_factory=dict)
    experience_requirements: str
    responsibilities: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)

class BlockMatchItem(BaseModel):
    block_id: int
    relevance_score: int
    match_reason: str
    suggested_focus: str

class MatchBlocksRequest(BaseModel):
    job_description: str
    extracted_requirements: Dict[str, Any]
    blocks: List[ExperienceBlockResponse]

class MatchBlocksResponse(BaseModel):
    matches: List[BlockMatchItem]

class RewriteBulletsRequest(BaseModel):
    block_id: int
    title: str
    organization: str
    original_bullets: List[str]
    job_description: str
    extracted_requirements: Dict[str, Any]

class RewriteBulletsResponse(BaseModel):
    tailored_bullets: List[str]
    explanation: str


# --- Tailored Resume Schemas ---
class PersonalInfoSchema(BaseModel):
    full_name: str
    email: str
    phone: str
    location: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None

class SelectedBlockSchema(BaseModel):
    block_id: int
    title: str
    organization: str
    location: Optional[str] = None
    start_date: str
    end_date: str
    category: str
    original_bullets: List[str]
    tailored_bullets: List[str]

class TailoredResumeCreate(BaseModel):
    job_title: str
    company: str
    job_description: str
    extracted_requirements: Dict[str, Any]
    selected_blocks: List[SelectedBlockSchema]
    personal_info: PersonalInfoSchema

class TailoredResumeResponse(BaseModel):
    id: int
    job_title: str
    company: str
    job_description: str
    extracted_requirements: Dict[str, Any]
    selected_blocks: List[SelectedBlockSchema]
    personal_info: PersonalInfoSchema
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
