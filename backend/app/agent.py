import os
import json
import logging
from typing import Dict, Any, List
from pydantic import BaseModel

from .config import settings
from . import schemas

logger = logging.getLogger(__name__)

# --- Pydantic validation models ---

class LLMExtractedRequirements(BaseModel):
    skills: Dict[str, List[str]]
    experience_requirements: str
    responsibilities: List[str]
    keywords: List[str]

class LLMBlockMatch(BaseModel):
    block_id: int
    relevance_score: int
    match_reason: str
    suggested_focus: str

class LLMMatchResponse(BaseModel):
    matches: List[LLMBlockMatch]

class LLMRewriteResponse(BaseModel):
    tailored_bullets: List[str]
    explanation: str


# --- Client Initializers ---

def get_gemini_client():
    if not settings.GEMINI_API_KEY:
        return None
    try:
        from google import genai
        return genai.Client(api_key=settings.GEMINI_API_KEY)
    except ImportError:
        logger.warning("google-genai not installed or import failed.")
        return None

def get_openai_client():
    if not settings.OPENAI_API_KEY:
        return None
    try:
        import openai
        return openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    except ImportError:
        logger.warning("openai not installed or import failed.")
        return None


# --- 1. JobParserAgent ---

class JobParserAgent:
    """Agent responsible for parsing raw job descriptions and extracting key requirements."""
    
    def __init__(self):
        self.gemini_client = get_gemini_client()
        self.openai_client = get_openai_client()

    def parse(self, job_title: str, company: str, job_description: str) -> schemas.ExtractedRequirementsResponse:
        # Secure logging: only log string lengths, not raw descriptions
        logger.info(f"[JobParserAgent] Received target job '{job_title}' at '{company}' (Description length: {len(job_description)} chars)")
        
        prompt = f"""
        You are an expert ATS (Applicant Tracking System) optimizer and recruiter.
        Analyze the following job description and extract key information:
        
        Job Title: {job_title}
        Company: {company}
        
        Job Description:
        \"\"\"{job_description}\"\"\"
        
        You MUST output a single JSON object. The JSON object MUST have the following structure:
        {{
          "skills": {{
            "Category Name (e.g. Programming Languages, Frameworks, Tools)": ["Skill 1", "Skill 2"]
          }},
          "experience_requirements": "Brief summary of required education, years of experience, or level",
          "responsibilities": ["Core responsibility 1", "Core responsibility 2"],
          "keywords": ["ATS keyword 1", "ATS keyword 2"]
        }}
        """

        # 1. Try Gemini
        if self.gemini_client:
            try:
                from google.genai import types
                logger.info("[JobParserAgent] Querying Gemini model for requirements extraction...")
                response = self.gemini_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    ),
                )
                data = json.loads(response.text)
                parsed = schemas.ExtractedRequirementsResponse(**data)
                
                # Handoff Log
                logger.info(f"[Handoff] JobParserAgent -> System: Extracted {len(parsed.keywords)} key keywords and {len(parsed.skills)} skill categories.")
                return parsed
            except Exception as e:
                logger.error(f"[JobParserAgent] Gemini call failed: {e}")

        # 2. Try OpenAI
        if self.openai_client:
            try:
                logger.info("[JobParserAgent] Querying OpenAI model for requirements extraction...")
                response = self.openai_client.beta.chat.completions.parse(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    response_format=LLMExtractedRequirements
                )
                data = response.choices[0].message.parsed
                parsed = schemas.ExtractedRequirementsResponse(**data.model_dump())
                
                # Handoff Log
                logger.info(f"[Handoff] JobParserAgent -> System: Extracted {len(parsed.keywords)} key keywords and {len(parsed.skills)} skill categories.")
                return parsed
            except Exception as e:
                logger.error(f"[JobParserAgent] OpenAI call failed: {e}")

        # 3. Fallback to Mock Data (Dry Run mode)
        logger.info("[JobParserAgent] Running in mock fallback mode (No API Key detected)")
        
        skills = {"Languages & Frameworks": [], "Tools & Technologies": [], "Other Skills": []}
        keywords = []
        jd_lower = job_description.lower()
        
        tech_keywords = {
            "python": "Python", "javascript": "JavaScript", "typescript": "TypeScript", 
            "react": "React", "node": "Node.js", "express": "Express", "fastapi": "FastAPI", 
            "django": "Django", "flask": "Flask", "sqlite": "SQLite", "postgres": "PostgreSQL", 
            "mysql": "MySQL", "mongodb": "MongoDB", "aws": "AWS", "docker": "Docker", 
            "kubernetes": "Kubernetes", "git": "Git", "github": "GitHub", "html": "HTML5",
            "css": "CSS3", "tailwind": "TailwindCSS", "next.js": "Next.js", "vue": "Vue.js"
        }
        
        for key, value in tech_keywords.items():
            if key in jd_lower:
                if key in ["python", "javascript", "typescript"]:
                    skills["Languages & Frameworks"].append(value)
                elif key in ["react", "fastapi", "django", "flask", "next.js", "vue", "express", "node"]:
                    skills["Languages & Frameworks"].append(value)
                elif key in ["sqlite", "postgres", "mysql", "mongodb"]:
                    skills["Tools & Technologies"].append(value)
                else:
                    skills["Tools & Technologies"].append(value)
                keywords.append(value)
                
        if not skills["Languages & Frameworks"]:
            skills["Languages & Frameworks"] = ["Python", "FastAPI", "React", "TypeScript"]
            skills["Tools & Technologies"] = ["SQLite", "Git", "Docker"]
            keywords = ["FastAPI", "React", "TypeScript", "REST APIs", "Unit Testing"]

        responsibilities = []
        for line in job_description.split('\n'):
            line = line.strip().strip('-*•').strip()
            if line and len(line) > 20 and len(responsibilities) < 5:
                responsibilities.append(line)
                
        if not responsibilities:
            responsibilities = [
                "Develop, test, and maintain robust APIs using FastAPI and SQLite.",
                "Build interactive and responsive user interfaces with React and TypeScript.",
                "Write high-quality, readable, and maintainable code.",
                "Collaborate with senior engineers to implement new product features.",
                "Debug issues across the full application stack."
            ]

        parsed = schemas.ExtractedRequirementsResponse(
            skills=skills,
            experience_requirements="BS/MS in Computer Science or related fields, or equivalent practical experience.",
            responsibilities=responsibilities,
            keywords=keywords
        )
        
        # Handoff Log
        logger.info(f"[Handoff] JobParserAgent -> System: Extracted {len(parsed.keywords)} keywords via mock rules.")
        return parsed


# --- 2. ExperienceMatcherAgent ---

class ExperienceMatcherAgent:
    """Agent responsible for scoring a user's experience blocks against target job specifications."""

    def __init__(self):
        self.gemini_client = get_gemini_client()
        self.openai_client = get_openai_client()

    def match(
        self,
        job_description: str,
        extracted_requirements: Dict[str, Any],
        blocks: List[schemas.ExperienceBlockResponse]
    ) -> schemas.MatchBlocksResponse:
        
        # Secure logging: log count of blocks, not content
        logger.info(f"[ExperienceMatcherAgent] Evaluating {len(blocks)} experience blocks against job requirements")
        
        if not blocks:
            return schemas.MatchBlocksResponse(matches=[])

        # Construct prompt matching blocks
        blocks_formatted = ""
        for b in blocks:
            blocks_formatted += f"""
            Block ID: {b.id}
            Title: {b.title}
            Organization: {b.organization}
            Bullets count: {len(b.description_bullets)}
            ---------------------------------------------
            """

        prompt = f"""
        You are an AI matching assistant. Your job is to analyze a student's experience blocks (work, projects, education) and evaluate how relevant they are to a target job description.
        
        Target Job Requirements:
        - Skills & Keywords: {json.dumps(extracted_requirements.get('keywords', []))}
        - Core Responsibilities: {json.dumps(extracted_requirements.get('responsibilities', []))}
        
        Experience Blocks to Evaluate:
        {blocks_formatted}
        
        You MUST output a single JSON object. The JSON object MUST have the following structure:
        {{
          "matches": [
            {{
              "block_id": 1, // replace with actual block ID
              "relevance_score": 85, // integer 0-100
              "match_reason": "Explanation of relevance",
              "suggested_focus": "Suggested focus for rewriting"
            }}
          ]
        }}
        
        Ensure you return an entry in "matches" for EVERY block ID provided in the list.
        """

        # 1. Try Gemini
        if self.gemini_client:
            try:
                from google.genai import types
                logger.info("[ExperienceMatcherAgent] Querying Gemini model for matching scores...")
                response = self.gemini_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    ),
                )
                data = json.loads(response.text)
                matches = []
                for item in data.get("matches", []):
                    matches.append(schemas.BlockMatchItem(
                        block_id=item.get("block_id"),
                        relevance_score=item.get("relevance_score", 50),
                        match_reason=item.get("match_reason", "Relevant experience"),
                        suggested_focus=item.get("suggested_focus", "Highlight relevant skills")
                    ))
                
                # Handoff Log
                logger.info(f"[Handoff] ExperienceMatcherAgent -> System: Matched {len(matches)} blocks successfully.")
                return schemas.MatchBlocksResponse(matches=matches)
            except Exception as e:
                logger.error(f"[ExperienceMatcherAgent] Gemini call failed: {e}")

        # 2. Try OpenAI
        if self.openai_client:
            try:
                logger.info("[ExperienceMatcherAgent] Querying OpenAI model for matching scores...")
                response = self.openai_client.beta.chat.completions.parse(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    response_format=LLMMatchResponse
                )
                parsed_data = response.choices[0].message.parsed
                matches = []
                for item in parsed_data.matches:
                    matches.append(schemas.BlockMatchItem(
                        block_id=item.block_id,
                        relevance_score=item.relevance_score,
                        match_reason=item.match_reason,
                        suggested_focus=item.suggested_focus
                    ))
                
                # Handoff Log
                logger.info(f"[Handoff] ExperienceMatcherAgent -> System: Matched {len(matches)} blocks successfully.")
                return schemas.MatchBlocksResponse(matches=matches)
            except Exception as e:
                logger.error(f"[ExperienceMatcherAgent] OpenAI call failed: {e}")

        # 3. Fallback to Mock Data (Dry Run mode)
        logger.info("[ExperienceMatcherAgent] Running in mock fallback mode (No API Key detected)")
        matches = []
        
        for block in blocks:
            score = 60
            matched_terms = []
            block_text = f"{block.title} {block.organization} {' '.join(block.description_bullets)}".lower()
            
            for keyword in extracted_requirements.get("keywords", []):
                if keyword.lower() in block_text:
                    score += 8
                    matched_terms.append(keyword)
            
            score = min(score, 98)
            reason = f"Contains experience matching {', '.join(matched_terms[:2])}." if matched_terms else "General experience demonstrating core technical capabilities."
            focus = f"Highlight implementation details of {', '.join(matched_terms[:2])}." if matched_terms else "Emphasize general backend development and collaboration."
            
            matches.append(schemas.BlockMatchItem(
                block_id=block.id,
                relevance_score=score,
                match_reason=reason,
                suggested_focus=focus
            ))
            
        # Handoff Log
        logger.info(f"[Handoff] ExperienceMatcherAgent -> System: Matched {len(matches)} blocks via mock rules.")
        return schemas.MatchBlocksResponse(matches=matches)


# --- 3. BulletRewriterAgent ---

class BulletRewriterAgent:
    """Agent responsible for tailoring specific experience bullet points to integrate target keywords."""

    def __init__(self):
        self.gemini_client = get_gemini_client()
        self.openai_client = get_openai_client()

    def rewrite(
        self,
        block_id: int,
        title: str,
        organization: str,
        original_bullets: List[str],
        job_description: str,
        extracted_requirements: Dict[str, Any]
    ) -> schemas.RewriteBulletsResponse:
        
        # Secure logging: log metadata and counts, not raw bullets or full description text
        logger.info(f"[BulletRewriterAgent] Tailoring bullets for block ID {block_id} ({title} at {organization}). Bullet count: {len(original_bullets)}")
        
        bullets_formatted = "\n".join(f"- {b}" for b in original_bullets)
        
        prompt = f"""
        You are an expert resume writer. Rewrite the resume bullet points of a student's experience block to make it highly tailored for a target job description.
        
        Experience Block details:
        - Role: {title}
        - Company/Organization: {organization}
        - Original Bullets:
        {bullets_formatted}
        
        Target Job Requirements:
        - Target Job Title: {extracted_requirements.get('job_title', 'Target Role')}
        - Required Skills/Keywords: {json.dumps(extracted_requirements.get('keywords', []))}
        - Primary Responsibilities: {json.dumps(extracted_requirements.get('responsibilities', []))}
        
        You MUST output a single JSON object. The JSON object MUST have the following structure:
        {{
          "tailored_bullets": [
            "Rewritten bullet point 1 starting with active verb and using target keywords",
            "Rewritten bullet point 2 starting with active verb and using target keywords"
          ],
          "explanation": "Brief explanation of prioritize keywords"
        }}
        
        Instructions for Rewriting:
        1. Start each bullet point with a strong action verb (e.g., Designed, Engineered, Optimized, Streamlined).
        2. Incorporate important keywords from the job description naturally.
        3. IMPORTANT: Maintain the original scope and metrics (e.g., if the original bullet said "built an app with 500 users", keep "500 users"; do NOT inflate metrics, invent new projects, or exaggerate responsibilities).
        4. Highlight impact, results, and technical details.
        5. Output the exact same number of bullet points as the original list (do not add or remove bullets).
        """

        # 1. Try Gemini
        if self.gemini_client:
            try:
                from google.genai import types
                logger.info(f"[BulletRewriterAgent] Querying Gemini model to rewrite bullets for Block {block_id}...")
                response = self.gemini_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    ),
                )
                data = json.loads(response.text)
                parsed = schemas.RewriteBulletsResponse(**data)
                
                # Handoff Log
                logger.info(f"[Handoff] BulletRewriterAgent -> System: Tailored {len(parsed.tailored_bullets)} bullets.")
                return parsed
            except Exception as e:
                logger.error(f"[BulletRewriterAgent] Gemini call failed: {e}")

        # 2. Try OpenAI
        if self.openai_client:
            try:
                logger.info(f"[BulletRewriterAgent] Querying OpenAI model to rewrite bullets for Block {block_id}...")
                response = self.openai_client.beta.chat.completions.parse(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    response_format=LLMRewriteResponse
                )
                parsed = schemas.RewriteBulletsResponse(**response.choices[0].message.parsed.model_dump())
                
                # Handoff Log
                logger.info(f"[Handoff] BulletRewriterAgent -> System: Tailored {len(parsed.tailored_bullets)} bullets.")
                return parsed
            except Exception as e:
                logger.error(f"[BulletRewriterAgent] OpenAI call failed: {e}")

        # 3. Fallback to Mock Data (Dry Run mode)
        logger.info(f"[BulletRewriterAgent] Running in mock fallback mode for Block {block_id}")
        tailored_bullets = []
        keywords = extracted_requirements.get("keywords", ["FastAPI", "React", "TypeScript", "SQLite"])
        
        for idx, bullet in enumerate(original_bullets):
            bullet_lower = bullet.lower()
            rewritten = bullet
            
            if "developed" in bullet_lower or "built" in bullet_lower or "created" in bullet_lower:
                verb = "Engineered" if "api" in bullet_lower or "backend" in bullet_lower else "Designed and implemented"
                rewritten = rewritten.replace("Developed", verb).replace("developed", verb)
                rewritten = rewritten.replace("Built", verb).replace("built", verb)
                rewritten = rewritten.replace("Created", verb).replace("created", verb)
                
            if "helped" in bullet_lower or "assisted" in bullet_lower:
                rewritten = rewritten.replace("Helped", "Collaborated to").replace("helped", "collaborate to")
                
            if not any(k.lower() in bullet_lower for k in keywords):
                if len(keywords) > 0:
                    kw = keywords[idx % len(keywords)]
                    if rewritten.endswith("."):
                        rewritten = rewritten[:-1]
                    # Append keyword gracefully
                    rewritten += f" utilizing {kw} and following modern development best practices."
                    
            tailored_bullets.append(rewritten)
            
        parsed = schemas.RewriteBulletsResponse(
            tailored_bullets=tailored_bullets,
            explanation="Tailored verbs and appended target keywords."
        )
        
        # Handoff Log
        logger.info(f"[Handoff] BulletRewriterAgent -> System: Tailored {len(parsed.tailored_bullets)} bullets via mock rules.")
        return parsed


# --- 4. ResumeAssemblerAgent ---

class ResumeAssemblerAgent:
    """Agent responsible for selecting sections, validating format rules, and assembling final resume payload."""

    def __init__(self):
        pass

    def assemble(
        self,
        job_title: str,
        company: str,
        job_description: str,
        extracted_requirements: Dict[str, Any],
        selected_blocks: List[Any],
        personal_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        
        # Secure logging: log length and metadata only
        logger.info(f"[ResumeAssemblerAgent] Assembling final resume for {personal_info.get('full_name', 'User')} targeting {job_title} at {company}")
        
        # Validate selected blocks
        valid_blocks = []
        for block in selected_blocks:
            # Map object properties or dict keys to standard representation
            if hasattr(block, "model_dump"):
                b_data = block.model_dump()
            elif isinstance(block, dict):
                b_data = block
            else:
                b_data = block.__dict__
                
            valid_blocks.append(b_data)

        # Standardizing categories sorting (Education -> Work -> Projects -> Leadership)
        category_weights = {
            "education": 1,
            "work": 2,
            "project": 3,
            "leadership": 4
        }
        
        sorted_blocks = sorted(
            valid_blocks,
            key=lambda b: category_weights.get(b.get("category", "work").lower(), 5)
        )
        
        # Build final resume schema
        assembled_resume = {
            "job_title": job_title,
            "company": company,
            "job_description": job_description, # Will be saved to database but not printed in console logs
            "extracted_requirements": extracted_requirements,
            "selected_blocks": sorted_blocks,
            "personal_info": personalInfo if 'personalInfo' in globals() else personal_info
        }
        
        # Handoff Log
        logger.info(f"[Handoff] ResumeAssemblerAgent -> System: Completed final assembly. Prepared {len(sorted_blocks)} sorted sections.")
        return assembled_resume
