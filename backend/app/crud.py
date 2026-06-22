import json
from sqlalchemy.orm import Session
from . import models, schemas

# --- Experience Block CRUD ---

def get_experience_block(db: Session, block_id: int):
    db_block = db.query(models.ExperienceBlock).filter(models.ExperienceBlock.id == block_id).first()
    if not db_block:
        return None
    # Convert JSON string to list for Pydantic schema validation
    return schemas.ExperienceBlockResponse(
        id=db_block.id,
        title=db_block.title,
        organization=db_block.organization,
        location=db_block.location,
        start_date=db_block.start_date,
        end_date=db_block.end_date,
        description_bullets=json.loads(db_block.description_bullets),
        category=db_block.category,
        created_at=db_block.created_at,
        updated_at=db_block.updated_at
    )

def get_experience_blocks(db: Session, skip: int = 0, limit: int = 100):
    db_blocks = db.query(models.ExperienceBlock).offset(skip).limit(limit).all()
    results = []
    for db_block in db_blocks:
        results.append(schemas.ExperienceBlockResponse(
            id=db_block.id,
            title=db_block.title,
            organization=db_block.organization,
            location=db_block.location,
            start_date=db_block.start_date,
            end_date=db_block.end_date,
            description_bullets=json.loads(db_block.description_bullets),
            category=db_block.category,
            created_at=db_block.created_at,
            updated_at=db_block.updated_at
        ))
    return results

def create_experience_block(db: Session, block: schemas.ExperienceBlockCreate):
    db_block = models.ExperienceBlock(
        title=block.title,
        organization=block.organization,
        location=block.location,
        start_date=block.start_date,
        end_date=block.end_date,
        description_bullets=json.dumps(block.description_bullets),
        category=block.category
    )
    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    return get_experience_block(db, db_block.id)

def update_experience_block(db: Session, block_id: int, block: schemas.ExperienceBlockUpdate):
    db_block = db.query(models.ExperienceBlock).filter(models.ExperienceBlock.id == block_id).first()
    if not db_block:
        return None
    
    update_data = block.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "description_bullets":
            setattr(db_block, key, json.dumps(value))
        else:
            setattr(db_block, key, value)
            
    db.commit()
    db.refresh(db_block)
    return get_experience_block(db, db_block.id)

def delete_experience_block(db: Session, block_id: int):
    db_block = db.query(models.ExperienceBlock).filter(models.ExperienceBlock.id == block_id).first()
    if not db_block:
        return False
    db.delete(db_block)
    db.commit()
    return True


# --- Tailored Resume CRUD ---

def get_tailored_resume(db: Session, resume_id: int):
    db_resume = db.query(models.TailoredResume).filter(models.TailoredResume.id == resume_id).first()
    if not db_resume:
        return None
    return schemas.TailoredResumeResponse(
        id=db_resume.id,
        job_title=db_resume.job_title,
        company=db_resume.company,
        job_description=db_resume.job_description,
        extracted_requirements=json.loads(db_resume.extracted_requirements) if db_resume.extracted_requirements else {},
        selected_blocks=json.loads(db_resume.selected_blocks) if db_resume.selected_blocks else [],
        personal_info=json.loads(db_resume.personal_info) if db_resume.personal_info else {},
        created_at=db_resume.created_at,
        updated_at=db_resume.updated_at
    )

def get_tailored_resumes(db: Session, skip: int = 0, limit: int = 100):
    db_resumes = db.query(models.TailoredResume).offset(skip).limit(limit).all()
    results = []
    for db_resume in db_resumes:
        results.append(schemas.TailoredResumeResponse(
            id=db_resume.id,
            job_title=db_resume.job_title,
            company=db_resume.company,
            job_description=db_resume.job_description,
            extracted_requirements=json.loads(db_resume.extracted_requirements) if db_resume.extracted_requirements else {},
            selected_blocks=json.loads(db_resume.selected_blocks) if db_resume.selected_blocks else [],
            personal_info=json.loads(db_resume.personal_info) if db_resume.personal_info else {},
            created_at=db_resume.created_at,
            updated_at=db_resume.updated_at
        ))
    return results

def create_tailored_resume(db: Session, resume: schemas.TailoredResumeCreate):
    db_resume = models.TailoredResume(
        job_title=resume.job_title,
        company=resume.company,
        job_description=resume.job_description,
        extracted_requirements=json.dumps(resume.extracted_requirements),
        selected_blocks=json.dumps([block.model_dump() for block in resume.selected_blocks]),
        personal_info=json.dumps(resume.personal_info.model_dump())
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return get_tailored_resume(db, db_resume.id)

def delete_tailored_resume(db: Session, resume_id: int):
    db_resume = db.query(models.TailoredResume).filter(models.TailoredResume.id == resume_id).first()
    if not db_resume:
        return False
    db.delete(db_resume)
    db.commit()
    return True

def purge_all_data(db: Session):
    db.query(models.ExperienceBlock).delete()
    db.query(models.TailoredResume).delete()
    db.commit()
    return True

