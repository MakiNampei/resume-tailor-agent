import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    PROJECT_NAME: str = "ResumeTailor Agent API"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./resume_tailor.db")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    PORT: int = int(os.getenv("PORT", "8000"))

settings = Settings()
