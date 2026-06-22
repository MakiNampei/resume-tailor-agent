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

---

## Demo Script for Video Recording

Here is a 2-minute walkthrough guide for video submissions:

1. **Introduction (0:00 - 0:20)**:
   - Introduce yourself and state: "This is ResumeTailor Agent, a capstone submission demonstrating Multi-Agent systems, MCP servers, and secure local-first design."
   - Show the Dashboard and the beautiful glassmorphism dark theme.

2. **Experience Library & Danger Zone (0:20 - 0:45)**:
   - Click "Experience Library". Show how students can add or edit blocks.
   - Point out the "Danger Zone" block at the bottom of the page: "Our security design provides a right-to-erasure button with a double-confirmation mechanism."

3. **Multi-Agent Wizard Flow (0:45 - 1:25)**:
   - Go to "Tailor Assistant". Paste a Software Engineer job description and click "Extract Requirements".
   - Show the scanning animation and explain: "This starts our multi-agent pipeline. First, the `JobParser` extracts skills, which are handed off to the `Matcher` to score our saved blocks."
   - Select blocks, click "Tailor Bullets". Show the side-by-side editing view: "Here, the `BulletRewriter` tailors wording while protecting metric values. Users can directly tweak the outputs."

4. **Preview & Export (1:25 - 1:45)**:
   - Proceed to Step 4. Point out the standard resume sheet rendering: "The `ResumeAssembler` validates the final document. We have confirmations before printing or exporting to DOCX/PDF."
   - Click "Download DOCX", show the confirmation popup, and click download.

5. **MCP Server Terminal Demonstration (1:45 - 2:00)**:
   - Show your terminal running `python mcp_server.py` or the test suite: "Finally, our custom MCP server exposes tools allowing external LLMs to read, write, and search blocks directly in our database."
