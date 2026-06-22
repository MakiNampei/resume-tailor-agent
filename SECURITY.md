# Security & Privacy Policy

ResumeTailor Agent is designed with local-first, privacy-respecting architectures suitable for academic, corporate, and private environments. Below are the design choices implemented to protect user data and credentials.

---

## 1. Local Data Persistence
All experience library blocks and tailored resume logs are stored locally on your machine in a SQLite database file:
- File location: `backend/resume_tailor.db` (auto-created on startup).
- There is no registration, cloud synchronization, or remote database connection. Your professional history remains completely under your control.

## 2. API Key Management
The application requires API keys to connect to Google Gemini or OpenAI language models:
- **Environment Storage**: API keys are loaded exclusively from a local `.env` environment file in the `backend/` folder.
- **Git Safety**: The `.env` file is excluded from Git tracking (via `.gitignore`) to prevent accidental credential leakage. We provide a `.env.example` template for configuration.
- **Fallback Mode**: If no API keys are supplied, the application runs entirely offline in **Mock/Dry-Run Mode**, processing requests locally without sending any data over the internet.

## 3. Data Transmission Policy
When API keys are configured and live tailoring is executed:
- Raw job descriptions and experience bullets are sent directly to the official LLM APIs (Google Gemini or OpenAI) via secure HTTPS requests.
- No intermediary servers, webhooks, or telemetry trackers receive or process this data.

## 4. Log Privacy & Scrubber Rules
To prevent leakage of personal details or proprietary job requirements in system logs, the backend follows strict logging protocols:
- **No Raw Text Logs**: Full job descriptions and raw resume bullet points are never written to the terminal or log files.
- **Metadata Logging Only**: Logs record non-sensitive metadata, such as string lengths, block counts, matching scores, and execution times (e.g., `[JobParserAgent] Received target job (Description length: 1420 chars)`).

## 5. Right to Erasure (Database Purging)
We provide a complete database purge utility:
- **Danger Zone**: Available at the bottom of the **Experience Library** view in the UI.
- **Double-Confirmation**: Deletion requires responding to multiple confirmation dialogs to prevent accidental execution.
- **Purge Endpoint**: Invokes `DELETE /api/danger/purge` on the FastAPI server, executing a SQL deletion of all tables.
