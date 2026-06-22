from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from .database import engine, Base, get_db
from . import models, schemas, crud, agent, export

# Auto-create SQLite database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ResumeTailor Agent API")

# Configure CORS for React frontend (Vite defaults to port 5173 or 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate the Multi-Agent System components
job_parser_agent = agent.JobParserAgent()
experience_matcher_agent = agent.ExperienceMatcherAgent()
bullet_rewriter_agent = agent.BulletRewriterAgent()
resume_assembler_agent = agent.ResumeAssemblerAgent()


# --- Root Endpoint ---
@app.get("/")
def read_root():
    return {"message": "Welcome to ResumeTailor Agent API", "status": "running"}


# --- Experience Blocks CRUD ---

@app.get("/api/blocks", response_model=List[schemas.ExperienceBlockResponse])
def read_blocks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_experience_blocks(db, skip=skip, limit=limit)

@app.post("/api/blocks", response_model=schemas.ExperienceBlockResponse)
def create_block(block: schemas.ExperienceBlockCreate, db: Session = Depends(get_db)):
    return crud.create_experience_block(db, block=block)

@app.put("/api/blocks/{block_id}", response_model=schemas.ExperienceBlockResponse)
def update_block(block_id: int, block: schemas.ExperienceBlockUpdate, db: Session = Depends(get_db)):
    db_block = crud.update_experience_block(db, block_id=block_id, block=block)
    if db_block is None:
        raise HTTPException(status_code=404, detail="Experience block not found")
    return db_block

@app.delete("/api/blocks/{block_id}", response_model=dict)
def delete_block(block_id: int, db: Session = Depends(get_db)):
    success = crud.delete_experience_block(db, block_id=block_id)
    if not success:
        raise HTTPException(status_code=404, detail="Experience block not found")
    return {"message": "Experience block deleted successfully"}


# --- AI Tailoring Agents ---

@app.post("/api/tailor/extract", response_model=schemas.ExtractedRequirementsResponse)
def extract_requirements(input_data: schemas.JobDescriptionInput):
    try:
        return job_parser_agent.parse(
            job_title=input_data.job_title,
            company=input_data.company,
            job_description=input_data.job_description
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract requirements: {str(e)}")

@app.post("/api/tailor/match", response_model=schemas.MatchBlocksResponse)
def match_blocks(request_data: schemas.MatchBlocksRequest):
    try:
        return experience_matcher_agent.match(
            job_description=request_data.job_description,
            extracted_requirements=request_data.extracted_requirements,
            blocks=request_data.blocks
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to match blocks: {str(e)}")

@app.post("/api/tailor/rewrite", response_model=schemas.RewriteBulletsResponse)
def rewrite_block_bullets(request_data: schemas.RewriteBulletsRequest):
    try:
        return bullet_rewriter_agent.rewrite(
            block_id=request_data.block_id,
            title=request_data.title,
            organization=request_data.organization,
            original_bullets=request_data.original_bullets,
            job_description=request_data.job_description,
            extracted_requirements=request_data.extracted_requirements
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rewrite bullets: {str(e)}")


# --- Resumes CRUD ---

@app.get("/api/resumes", response_model=List[schemas.TailoredResumeResponse])
def read_resumes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_tailored_resumes(db, skip=skip, limit=limit)

@app.post("/api/resumes", response_model=schemas.TailoredResumeResponse)
def save_resume(resume: schemas.TailoredResumeCreate, db: Session = Depends(get_db)):
    try:
        # 1. Handoff context to ResumeAssemblerAgent to format/sort sections
        assembled_data = resume_assembler_agent.assemble(
            job_title=resume.job_title,
            company=resume.company,
            job_description=resume.job_description,
            extracted_requirements=resume.extracted_requirements,
            selected_blocks=resume.selected_blocks,
            personal_info=resume.personal_info.model_dump()
        )
        # 2. Map and validate via Pydantic
        validated_resume = schemas.TailoredResumeCreate(**assembled_data)
        
        # 3. Create database entry
        return crud.create_tailored_resume(db, resume=validated_resume)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assemble or save resume: {str(e)}")

@app.get("/api/resumes/{resume_id}", response_model=schemas.TailoredResumeResponse)
def read_resume(resume_id: int, db: Session = Depends(get_db)):
    db_resume = crud.get_tailored_resume(db, resume_id=resume_id)
    if db_resume is None:
        raise HTTPException(status_code=404, detail="Tailored resume not found")
    return db_resume

@app.delete("/api/resumes/{resume_id}", response_model=dict)
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    success = crud.delete_tailored_resume(db, resume_id=resume_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tailored resume not found")
    return {"message": "Tailored resume deleted successfully"}


# --- Danger Zone Purge Endpoint (Security Feature) ---

@app.delete("/api/danger/purge", response_model=dict)
def purge_database(db: Session = Depends(get_db)):
    try:
        crud.purge_all_data(db)
        return {"message": "All database records have been purged successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database purge failed: {str(e)}")


# --- Document Export Endpoints ---

@app.post("/api/resumes/export/docx")
def export_docx(resume_data: Dict[str, Any]):
    try:
        file_stream = export.generate_docx_resume(resume_data)
        filename = f"Resume_{resume_data.get('job_title', 'Tailored')}_{resume_data.get('company', 'Company')}.docx"
        # Sanitize filename spacing
        filename = filename.replace(" ", "_")
        return StreamingResponse(
            file_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate DOCX: {str(e)}")

@app.post("/api/resumes/export/pdf")
def export_pdf(resume_data: Dict[str, Any]):
    try:
        file_stream = export.generate_pdf_resume(resume_data)
        filename = f"Resume_{resume_data.get('job_title', 'Tailored')}_{resume_data.get('company', 'Company')}.pdf"
        # Sanitize filename spacing
        filename = filename.replace(" ", "_")
        return StreamingResponse(
            file_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
