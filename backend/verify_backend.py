import sys
import os
import json

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, Base, engine
from app import crud, schemas, agent, export

def verify_all():
    print("=== STARTING BACKEND CAPSTONE VERIFICATION ===")
    
    # 1. Create tables
    print("\n1. Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    print("Database tables initialized successfully.")
    
    # Instantiate the new Agent classes
    parser = agent.JobParserAgent()
    matcher = agent.ExperienceMatcherAgent()
    rewriter = agent.BulletRewriterAgent()
    assembler = agent.ResumeAssemblerAgent()
    
    # 2. Test Experience Block Creation & Retrieval
    print("\n2. Testing Experience Block CRUD...")
    block_data = schemas.ExperienceBlockCreate(
        title="Software Engineer Intern",
        organization="Google",
        location="Mountain View, CA",
        start_date="June 2025",
        end_date="August 2025",
        description_bullets=[
            "Developed REST APIs using FastAPI.",
            "Optimized SQL queries, improving latency by 15%."
        ],
        category="work"
    )
    
    # Create block
    created_block = crud.create_experience_block(db, block_data)
    print(f"Created Block ID: {created_block.id}")
    assert created_block.title == "Software Engineer Intern"
    assert "FastAPI" in created_block.description_bullets[0]
    
    # Get blocks
    all_blocks = crud.get_experience_blocks(db)
    print(f"Retrieved {len(all_blocks)} blocks from library.")
    assert len(all_blocks) > 0
    
    # 3. Test JobParserAgent Requirements Extraction
    print("\n3. Testing JobParserAgent Requirements Extraction...")
    extracted = parser.parse(
        job_title="Backend Developer",
        company="Stripe",
        job_description="We are looking for a Python developer with experience building REST APIs with FastAPI and databases like SQLite or PostgreSQL."
    )
    print(f"Extracted Skills: {json.dumps(extracted.skills)}")
    assert len(extracted.keywords) > 0
    
    # 4. Test ExperienceMatcherAgent Block Matching
    print("\n4. Testing ExperienceMatcherAgent Block Matching...")
    match_response = matcher.match(
        job_description="FastAPI REST APIs SQLite",
        extracted_requirements=extracted.model_dump(),
        blocks=all_blocks
    )
    print(f"Match relevance score for Block {all_blocks[0].id}: {match_response.matches[0].relevance_score}%")
    assert match_response.matches[0].relevance_score > 50
    
    # 5. Test BulletRewriterAgent Bullet Rewriting
    print("\n5. Testing BulletRewriterAgent Bullet Rewriting...")
    rewrite_response = rewriter.rewrite(
        block_id=created_block.id,
        title=created_block.title,
        organization=created_block.organization,
        original_bullets=created_block.description_bullets,
        job_description="FastAPI backend APIs",
        extracted_requirements=extracted.model_dump()
    )
    print(f"Original Bullets: {created_block.description_bullets}")
    print(f"AI-Tailored Bullets: {rewrite_response.tailored_bullets}")
    assert len(rewrite_response.tailored_bullets) == len(created_block.description_bullets)

    # 6. Test ResumeAssemblerAgent
    print("\n6. Testing ResumeAssemblerAgent Assembly...")
    personal_info = {
        "full_name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "555-123-4567",
        "location": "San Francisco, CA",
        "github": "github.com/janedoe",
        "linkedin": "linkedin.com/in/janedoe",
        "website": "janedoe.me"
    }
    
    selected_blocks_payload = [
        {
            "block_id": created_block.id,
            "title": created_block.title,
            "organization": created_block.organization,
            "location": created_block.location,
            "start_date": created_block.start_date,
            "end_date": created_block.end_date,
            "category": created_block.category,
            "original_bullets": created_block.description_bullets,
            "tailored_bullets": rewrite_response.tailored_bullets
        }
    ]
    
    assembled = assembler.assemble(
        job_title="Backend Developer",
        company="Stripe",
        job_description="FastAPI backend developer role",
        extracted_requirements=extracted.model_dump(),
        selected_blocks=selected_blocks_payload,
        personal_info=personal_info
    )
    print(f"Assembled resume sections count: {len(assembled['selected_blocks'])}")
    assert assembled["job_title"] == "Backend Developer"
    assert len(assembled["selected_blocks"]) == 1
    
    # 7. Test Exporter (DOCX and PDF generation)
    print("\n7. Testing Document Exporter (DOCX & PDF)...")
    docx_stream = export.generate_docx_resume(assembled)
    print(f"DOCX stream generated: {len(docx_stream.getvalue())} bytes.")
    assert len(docx_stream.getvalue()) > 0
    
    pdf_stream = export.generate_pdf_resume(assembled)
    print(f"PDF stream generated: {len(pdf_stream.getvalue())} bytes.")
    assert len(pdf_stream.getvalue()) > 0
    
    # 8. Test danger purge CRUD utility
    print("\n8. Testing Database Purge Utility...")
    crud.purge_all_data(db)
    all_blocks_post_purge = crud.get_experience_blocks(db)
    print(f"Blocks post purge: {len(all_blocks_post_purge)}")
    assert len(all_blocks_post_purge) == 0
    
    db.close()
    print("\n=== ALL CAPSTONE BACKEND TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    verify_all()
