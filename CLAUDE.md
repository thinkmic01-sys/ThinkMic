# CLAUDE.md - ThinkMic Knowledge Base & Developer Guidelines

## Project Overview & Core Purpose
**ThinkMic** is an AI-driven audio intelligence, automated research, and document synthesis platform. Key capabilities:
- **Audio Intelligence**: Live audio streaming (Deepgram WebSocket) and file uploads (OpenAI Whisper) supporting English and Urdu.
- **Automated Research**: AI extracts search queries from transcripts; BullMQ workers fetch web intelligence via Tavily/SerpAPI.
- **Document Synthesis**: Publication-ready PDF & DOCX generation with custom brand styling (`#222777` Navy, `#00C2CB` Cyan).
- **Seminars & LMS**: Geolocation-based seminar discovery (Leaflet), course workbooks, and automated daily reminder crons.
- **Collaborative Research**: Dynamic schema builder, custom data collection forms, and gamified achievement timelines.

---

## Development Philosophy
- **Simplest Working Solution**: Always prefer the most direct, minimal solution that solves the issue.
- **Reuse Before Creating**: Reuse existing helpers, services, and components before writing new abstractions.
- **Do Not Over-Engineer**: Avoid premature optimizations or unnecessary complexity.
- **Preserve Existing Architecture**: Maintain established controller-service-worker boundaries.
- **Thin Controllers**: Keep controllers focused on request parsing and response formatting; place business logic in services/workers.
- **Dependencies**: Ask for explicit user approval before introducing any new npm packages.
- **Strict Scope Boundary**: Minimize edits strictly to the files needed for the requested feature.

---

## Token Efficiency Rules
- **No Full Scans**: Never scan the entire repository unless explicitly instructed.
- **Targeted Reads**: Read only the specific files directly required for the immediate task.
- **Use CLAUDE.md First**: Consult this document for architectural and schema context before opening files.
- **Justify Extra File Reads**: Briefly explain why if additional unfamiliar files must be viewed.
- **Avoid Unrelated Modules**: Do not load or inspect modules unrelated to the current task.
- **Diff-First Verification**: Use git diffs to verify changes rather than rescanning the workspace.

---

## Git Workflow & Personal Preferences
- **Git Workflow**:
  - One feature = one clean commit.
  - Respect existing Git history.
  - Never touch or modify unrelated uncommitted files.
  - Review diffs carefully before finalizing tasks.
- **Personal Preferences**:
  - **No Unsolicited Refactoring**: Never refactor working code unless explicitly requested.
  - **Preserve File Naming**: Never rename existing files or re-structure folders without explicit approval.
  - **Follow Naming Conventions**: Respect existing casing and naming conventions across the project.
  - **Plan First**: State the implementation plan and rationale before executing code changes.
  - **Surgical Modifications**: Edit only the lines and files required for the user's prompt.

---

## Tech Stack & Architecture Summary

### Backend & Workers
- **Runtime & Framework**: Node.js (CommonJS), Express.js 5.x (`backend/server.js`).
- **Database & Cache**: MongoDB with Mongoose 9.x (`backend/models/`), Redis with BullMQ 5.x (`backend/queues.js`).
- **Worker Subsystem**: Independent background workers (`workers/*.js`) listening on 4 Redis queues: `transcription`, `summarization`, `search`, `report-generation`.
- **Real-Time Layer**: Socket.IO with Redis Pub/Sub IPC (`backend/utils/socket.js`). Workers publish to Redis `socket_events`, forwarded to client rooms (`userId`).
- **Document Engine**: PDFKit & `docx` (`workers/utils/documentGenerator.js`).
- **Scheduled Jobs**: `node-cron` daily reminder runner (`backend/jobs/reminderCron.js`).

### Frontend
- **Framework & Build**: React 19 (ES Modules), Vite 8, React Router DOM 7.
- **State Management**: Redux Toolkit (`frontend/src/store/` with `authSlice`).
- **Styling**: Tailwind CSS v4 (`frontend/src/index.css`) with theme variables and Urdu Nastaliq font rules.
- **API Client**: Axios (`frontend/src/services/api.js`) with automatic 401 interceptor refresh loop.
- **Live Audio**: Direct browser WebSocket connection to Deepgram (`deepgramService.js`).
- **Maps**: Leaflet and React-Leaflet for geospatial seminar discovery.

---

## High-Level Folder Structure
```
ThinkMic/
├── backend/
│   ├── config/          # DB & Redis connection clients
│   ├── controllers/     # Route logic (auth, projects, reports, search, etc.)
│   ├── jobs/            # Cron jobs (reminderCron.js)
│   ├── middleware/      # JWT verification (protect) & role guards (checkRole)
│   ├── models/          # 21 Mongoose database schemas
│   ├── routes/          # API endpoints (/api/v1/*)
│   ├── services/        # OpenAI, Anthropic, S3 service wrappers
│   ├── utils/           # Socket.IO & Redis event forwarding
│   ├── queues.js        # BullMQ queue declarations
│   ├── server.js        # HTTP & Socket.IO server bootstrap
│   └── worker.js        # Worker runner loading /workers
├── frontend/
│   ├── src/
│   │   ├── components/  # Layout, Navbar, Sidebar, VoiceRecorder, etc.
│   │   ├── pages/       # Feature modules (projects, reports, dashboard, courses, etc.)
│   │   ├── services/    # api.js (Axios + auto-refresh), deepgramService.js
│   │   ├── store/       # Redux store & authSlice
│   │   └── App.jsx      # Root routing & silent auth refresh gate
│   └── index.css        # Tailwind v4 theme & typography
├── workers/             # BullMQ workers (transcription, summarization, search, reportGen)
└── CLAUDE.md            # Knowledge base for Claude Code
```

---

## Database Models Summary
All models reside in `backend/models/`:
- **Auth & Users**: `User` (roles, referral codes, coins), `Referral` (referral reward tracking), `Session`, `AuditLog`.
- **Audio & Research**: `Recording` (audio metadata/status), `Transcript` (Whisper text & segments), `Summary` (AI summary & query extraction), `SearchResult` (Tavily search items grouped by `sessionId`).
- **Reports & Notes**: `Report` (synthesized documents linking Summary + Search), `Note` (rich text & action items), `Project` (workspace container).
- **Seminars & LMS**: `Seminar` (events with coordinates), `Registration` (user bookings), `Course` (LMS modules & workbooks).
- **Forms & Data**: `FieldSchema` (dynamic form templates), `Submission` (schema records), `CollaborationSubmission`.
- **System & Gamification**: `TimelineEvent` / `Achievement` (milestone badges), `Notification`, `Ticket` (support queries), `Transaction`.

---

## API & Communication Conventions
- **Base Route**: All endpoints are mounted at `/api/v1/<resource>`.
- **HTTP Methods & Statuses**:
  - `GET`: `200 OK`
  - `POST` (Creation): `201 Created`
  - `POST` (Async Queue Submission): `202 Accepted` returning `{ sessionId, jobIds }`
  - `PUT` / `PATCH`: `200 OK`
  - `DELETE`: `200 OK`
  - Errors: `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `500` Server Error.
- **Standard Error Format**: `{ "message": "Descriptive text", "error": "Optional detail" }`.
- **Socket.IO Real-Time Events**:
  - Emitted to room `userId`: `job_progress`, `transcription_complete`, `summary_complete`, `report_complete`, `job_failed`.

---

## Auth & Security Flow
- **Dual-Token System**:
  - Access Token: Short-lived JWT kept in Redux memory (`Authorization: Bearer <token>`).
  - Refresh Token: 7-day JWT stored in secure `HttpOnly`, `SameSite=Strict` cookie (`refreshToken`).
- **Bootstrap & Recovery**: `App.jsx` silently calls `POST /api/v1/auth/refresh` on app startup. `api.js` interceptor automatically catches `401` responses, requests a new token, and replays failed requests.
- **RBAC**: Protected by `protect` and `checkRole('admin', ...)` middleware in `authMiddleware.js`.
- **Passwords**: Hashed with `bcryptjs`, always excluded via `.select('-passwordHash')`.

---

## Coding & UI Conventions
- **Backend**: CommonJS, `async/await`, try/catch blocks in all controllers. Fallbacks to mock responses if API keys are omitted or set to `'MOCK'`.
- **Frontend**: Functional components with Hooks, Redux selectors/dispatchers, Axios client.
- **Brand Colors & Theme**:
  - Primary Navy: `#222777`
  - Accent Cyan: `#00C2CB`
  - Background: `#f9f9ff`
  - Dark Surface / Text: `#181c22`
  - Muted: `#777682` / `#464651`
- **Urdu Typography**: Use `.font-urdu` class with increased line-height (`2.2`) for Nastaliq script.
- **File Naming**: PascalCase for React components/pages; camelCase for controllers/routes/services; PascalCase for Mongoose models.

---

## Environment Variables (Descriptions Only)
*Never commit or expose actual secrets or keys.*
- `PORT`: Server port (default `5000`).
- `MONGO_URI`: MongoDB connection string.
- `REDIS_URL`: Redis connection URL for BullMQ and Socket.IO Pub/Sub.
- `JWT_PRIVATE_KEY`: Secret key for signing access and refresh tokens.
- `CLIENT_URL`: Frontend URL for CORS authorization.
- `OPENAI_API_KEY`: API key for OpenAI Whisper and GPT models (or `'MOCK'`).
- `DEEPGRAM_API_KEY`: API key for live speech WebSocket streaming.
- `ANTHROPIC_API_KEY`: Claude API key for report synthesis fallback.
- `TAVILY_API_KEY`: Tavily API key for deep web research.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME`: AWS S3 configuration.

---

## Current Project Status

### Completed
- Full JWT authentication flow with silent refresh & RBAC.
- Dual-engine audio recording (Live Deepgram streaming + file Whisper transcription).
- BullMQ worker pipeline (4 asynchronous queues: transcription, summarization, search, report-generation).
- Real-time Socket.IO updates with Redis Pub/Sub IPC.
- Multi-query deep research execution via Tavily.
- Branded PDF & DOCX document generation.
- Projects Hub, Speech Workspace, Research Wizard, and Notes.
- Reports Library with in-place document customization, editing, and deletion.
- Seminar management with Leaflet map rendering and daily reminder cron jobs.
- Dynamic Schema Builder, Collaboration forms, LMS courses, and gamified achievement timelines.

### In Progress
- Finalizing custom report regeneration context compilation from multi-source queries.
- Optimizing document preview and instant download styling consistency.

### Planned
- Live AWS S3 production storage integration.
- Stripe / Payment Gateway for coin transactions and seminar registrations.
- Direct export integration (Google Drive / OneDrive).
- Real-time collaborative note-taking.

---

## Protected Files & Directories
*Do not modify without explicit user instruction:*
- `node_modules/` and lockfiles (`package-lock.json`).
- `.git/` directory.
- `backend/.env` (modify only when adding new configuration keys with user confirmation).
- `workers/utils/logo.jpg` (official branding asset).
- Database seeders (`backend/seedTimeline.js`, `backend/createAdmin.js`).
