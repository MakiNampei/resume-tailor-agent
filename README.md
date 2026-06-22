# ResumeTailor Agent (Kaggle Capstone)

ResumeTailor Agent is a full-stack, AI-powered web application designed for students and job seekers to manage their professional experiences, extract target job requirements, match relevant experience blocks, tailor bullet points to align with job descriptions, and export ATS-friendly resumes in DOCX and PDF formats.

This project is enhanced as a Capstone project for the Kaggle AI Agents program, showcasing multi-agent orchestrations, custom Model Context Protocol (MCP) servers, and secure data handling patterns.

---

## Architecture Diagram

```text
                               +-----------------------------+
                               |     Vite React Frontend     |
                               | (Dashboard, Wizard, Print)  |
                               +--------------+--------------+
                                              | HTTPS Requests
                                              v
                               +-----------------------------+
                               |       FastAPI Backend       |
                               |  (CORS, Exporters, Purge)   |
                               +-------+--------------+------+
                                       |              |
                   Invokes Orchestrator |              | Reads/Writes SQL
                                       v              v
      +------------------------------------------------------+
      |                  Multi-Agent System                  |
      |                                                      |
      |  [JobParserAgent] ----> [ExperienceMatcherAgent]     |
      |           |                       |                  |
      |           v                       v                  |
      |  [BulletRewriterAgent] -> [ResumeAssemblerAgent]     |
      +--------------------+---------------------------------+
                           |
                           v Local DB Sessions
             +----------------------------+
             |       SQLite Database      | <---+ Runs Tools
             |    (resume_tailor.db)      |     |
             +----------------------------+     |
                                                |
                               +----------------+------------+
                               |   Python FastMCP Server     |
                               | (add/list/search/save tools)|
                               +-----------------------------+
```

---

## Core Course Concepts Demonstrated

This capstone project implements and details **three required course concepts**:

### 1. Multi-Agent Orchestration Workflow
Instead of a single monolithic prompt, the tailoring lifecycle is divided among four distinct agents implemented as isolated classes in `backend/app/agent.py`:
- **`JobParserAgent`**: Extracts skills, keywords, responsibilities, and seniority from raw job descriptions.
- **`ExperienceMatcherAgent`**: Ranks the experience block library by relevance against requirements.
- **`BulletRewriterAgent`**: Rewrites descriptions using target keywords and action verbs while keeping numerical metrics truthful.
- **`ResumeAssemblerAgent`**: Groups, orders (Education -> Work -> Projects -> Activities), and structures the final schema.
Console logs display clean handoff lines (e.g. `[Handoff] JobParserAgent -> ExperienceMatcherAgent: Passing 5 keywords...`).

### 2. Model Context Protocol (MCP) Server Integration
Exposes the application's local database and core operations as tools that external AI assistants (like Claude Desktop or Gemini Enterprise) can invoke.
- File: `backend/mcp_server.py`
- Built using the official Anthropic `fastmcp` Python SDK.
- Tools exposed: `add_experience_block`, `list_experience_blocks`, `search_experience_blocks`, and `save_generated_resume`.

### 3. Secure and Privacy-First Engineering
- **API Key Isolation**: Keys are stored strictly in local `.env` files (template provided in `.env.example`).
- **Scrubbed Logs**: Loggers are configured to omit raw resume data, contact info, or full job descriptions in console text (logged as lengths or ID metadata only).
- **Data Deletion (Right to Erasure)**: Exposes a `DELETE /api/danger/purge` route and a double-confirmed "Danger Zone" purge button in the UI.
- **Confirmations**: Displays browser confirmation dialogs before downloading files.
- Full details documented in [SECURITY.md](SECURITY.md).

---

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your API keys to .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
*If no keys are supplied in `.env`, the server falls back to **Mock/Dry-Run Mode** automatically.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Running the MCP Server
To connect the ResumeTailor Agent database to an external MCP client (such as Claude Desktop):
```bash
# Start server in stdio mode (used by Desktop Clients)
cd backend
./venv/bin/python mcp_server.py
```
To register it in your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "resume-tailor": {
      "command": "/Users/makinampei/agy2-projects/my-first-project/ambient-expense-agent/resume-tailor-agent/backend/venv/bin/python",
      "args": [
        "/Users/makinampei/agy2-projects/my-first-project/ambient-expense-agent/resume-tailor-agent/backend/mcp_server.py"
      ]
    }
  }
}
```

---

## Verification & Testing

To execute the Capstone unit test suite verifying database integrations, agent handoffs, and exporters:
```bash
cd backend
venv/bin/python3 verify_backend.py
```

