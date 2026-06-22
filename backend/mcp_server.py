import sys
import os
from typing import List, Optional, Dict, Any

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastmcp import FastMCP
from app.database import SessionLocal
from app import crud, schemas

# Initialize the FastMCP server
mcp = FastMCP("ResumeTailor MCP Server")

@mcp.tool
def add_experience_block(
    title: str,
    organization: str,
    start_date: str,
    end_date: str,
    description_bullets: List[str],
    category: str = "work",
    location: Optional[str] = None
) -> str:
    """
    Add a reusable experience block to the database.
    
    Args:
        title: The job title or degree (e.g. 'Software Engineer Intern')
        organization: The company or school (e.g. 'Google')
        start_date: The start date (e.g. 'June 2025')
        end_date: The end date or 'Present' (e.g. 'August 2025')
        description_bullets: List of bullet points describing achievements
        category: 'work', 'project', 'education', or 'leadership'
        location: Location of the organization (optional)
    """
    db = SessionLocal()
    try:
        block = schemas.ExperienceBlockCreate(
            title=title,
            organization=organization,
            start_date=start_date,
            end_date=end_date,
            description_bullets=description_bullets,
            category=category,
            location=location
        )
        res = crud.create_experience_block(db, block)
        return f"Experience block created successfully with ID: {res.id}"
    finally:
        db.close()

@mcp.tool
def list_experience_blocks() -> List[Dict[str, Any]]:
    """
    List all experience blocks currently stored in the database.
    """
    db = SessionLocal()
    try:
        blocks = crud.get_experience_blocks(db)
        return [b.model_dump() for b in blocks]
    finally:
        db.close()

@mcp.tool
def search_experience_blocks(query: str) -> List[Dict[str, Any]]:
    """
    Search for experience blocks containing a specific text query in the title, organization, or bullets.
    
    Args:
        query: Text search term (case-insensitive)
    """
    db = SessionLocal()
    try:
        blocks = crud.get_experience_blocks(db)
        query_lower = query.lower()
        results = []
        for b in blocks:
            match_found = (
                query_lower in b.title.lower() or
                query_lower in b.organization.lower() or
                any(query_lower in bullet.lower() for bullet in b.description_bullets)
            )
            if match_found:
                results.append(b.model_dump())
        return results
    finally:
        db.close()

@mcp.tool
def save_generated_resume(
    job_title: str,
    company: str,
    job_description: str,
    extracted_requirements: Dict[str, Any],
    selected_blocks: List[Dict[str, Any]],
    personal_info: Dict[str, Any]
) -> str:
    """
    Save a generated/tailored resume to the SQLite database.
    
    Args:
        job_title: The target job title
        company: The target company
        job_description: The job description text
        extracted_requirements: Dict of skills, keywords, responsibilities, etc.
        selected_blocks: List of experience blocks used, including tailored and original bullets.
        personal_info: Personal contact info (name, email, phone, etc.)
    """
    db = SessionLocal()
    try:
        validated_blocks = []
        for b in selected_blocks:
            validated_blocks.append(schemas.SelectedBlockSchema(
                block_id=b.get("block_id", 0),
                title=b.get("title", ""),
                organization=b.get("organization", ""),
                location=b.get("location"),
                start_date=b.get("start_date", ""),
                end_date=b.get("end_date", ""),
                category=b.get("category", "work"),
                original_bullets=b.get("original_bullets", []),
                tailored_bullets=b.get("tailored_bullets", [])
            ))

        resume = schemas.TailoredResumeCreate(
            job_title=job_title,
            company=company,
            job_description=job_description,
            extracted_requirements=extracted_requirements,
            selected_blocks=validated_blocks,
            personal_info=schemas.PersonalInfoSchema(**personal_info)
        )
        res = crud.create_tailored_resume(db, resume)
        return f"Resume saved successfully with ID: {res.id}"
    finally:
        db.close()

if __name__ == "__main__":
    mcp.run()
