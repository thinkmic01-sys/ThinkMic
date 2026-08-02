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
- **Auth & Users**: `User` (roles, referral tree via `referredBy`, coin wallet `coins`/`heldCoins`, profile `title`/`preferredLanguage` - note: NOT `language`, which collides with MongoDB's reserved text-index `language_override` field since `fullName` has a text index), `Referral` (per-level L1/L2/L3 reward ledger row with `approvalStatus`/`approvedBy`/`rejectedBy`), `RewardSettings` (singleton, admin-configurable L1/L2/L3 coin amounts), `Session`, `AuditLog`.
- **Audio & Research**: `Recording` (audio metadata/status), `Transcript` (Whisper text & segments), `Summary` (AI summary & query extraction), `SearchResult` (Tavily search items grouped by `sessionId`).
- **Reports & Notes**: `Report` (synthesized documents linking Summary + Search), `Note` (rich text & action items), `Project` (workspace container).
- **Seminars & LMS**: `Seminar` (events; optional escrowed coin-reward campaign via `rewardEnabled`/`rewardPerUser`/`rewardMaxRecipients`/`rewardHeldAmount`), `Registration` (user bookings, `rewardClaimed`/`rewardAmount`), `Course` (LMS modules & workbooks).
- **Forms & Data**: `FieldSchema` (dynamic form templates, field types include `number`/`file` - see Known Issues in WORKLOG.md for a fixed round-trip bug), `Submission` (schema records), `CollaborationSubmission`.
- **System & Gamification**: `TimelineEvent` / `Achievement` (milestone badges - model + read API exist but nothing currently writes `TimelineEvent` docs outside a manual seed script, so the timeline is empty for real users), `Notification` (types include `reminder`/`system`/`update` plus referral/seminar reward events: `referral_pending`/`referral_approved`/`referral_rejected`/`seminar_reward_received`/`seminar_coins_reserved`/`seminar_coins_refunded`), `Ticket` (support queries), `Transaction` (coin ledger; `type`/`relatedUserId`/`relatedEntityType`/`relatedEntityId`/`status` fields).

### Coin Wallet & Referral Architecture
- `backend/services/coinWalletService.js` is the single choke point for every coin balance mutation (`creditCoins`/`debitCoins`/`holdCoins`/`spendHeldCoins`/`refundHeldCoins`) - always atomic (`findOneAndUpdate` with a `$gte` balance guard, never a read-modify-write `.save()`), always writes a `Transaction` + `AuditLog` row, and always excludes `passwordHash` from the returned `User`. Route new coin-affecting features through this service rather than mutating `User.coins`/`heldCoins` directly.
- `backend/services/referralService.js` builds the L1-L3 referral chain via `User.referredBy` (a user has at most one, immutable referrer) and creates *pending* `Referral` rows on registration - coins are only credited on admin approval (`rewardsAdminController.approveReward`), never instantly.
- Seminar reward campaigns use an escrow model: publishing holds `rewardPerUser * rewardMaxRecipients` out of the host's `coins` into `heldCoins`; each join atomically transfers `rewardPerUser` from `heldCoins` to the joiner (guarded so a campaign can never overshoot `rewardMaxRecipients`, verified under real concurrency); unused `heldCoins` are refunded on cancel/complete/delete or via the daily sweep in `backend/jobs/reminderCron.js`.
- Referral/coin admin surfaces live at `/app/admin/rewards` (`frontend/src/pages/Management/ReferralCoinManagement.jsx`) and reuse the exact `adminRoutes.js` router + `protect`/`checkRole('admin')` chain - no separate route file.

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
- **RBAC**: Protected by `protect` and `checkRole('admin', ...)` middleware in `authMiddleware.js`. `frontend/src/App.jsx` also has a client-side `RequireRole` wrapper on every `/app/admin/*` route (redirects non-permitted roles to `/app/dashboard`) - this is a UX layer only, the backend `checkRole` middleware remains the actual authorization boundary.
- **Passwords**: Hashed with `bcryptjs`, always excluded via `.select('-passwordHash')`. **This must be applied to every single `User.find*`/`findOneAndUpdate` call that can reach an API response** - a full backend audit found and fixed three call sites that were missing it (`adminController.listUsers`, `adminController.updateUserRoleStatus`, `adminController.inviteUsers`'s invite-summary response) before any client rendered the leaked field. When adding a new `User` query, default to excluding `passwordHash` unless there's a specific reason not to.

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
- Full JWT authentication flow with silent refresh & RBAC (server-side `checkRole` + client-side `RequireRole` route guard).
- Dual-engine audio recording (Live Deepgram streaming + file Whisper transcription).
- BullMQ worker pipeline (4 asynchronous queues: transcription, summarization, search, report-generation).
- Real-time Socket.IO updates with Redis Pub/Sub IPC. Support chat (`SupportSidebar`/`SupportInbox`) now correctly joins its socket room (`join` event) after a prior session's audit found and fixed an event-name mismatch that silently broke live delivery.
- Multi-query deep research execution via Tavily.
- Branded PDF & DOCX document generation.
- Projects Hub, Speech Workspace, Research Wizard, and Notes.
- Reports Library with in-place document customization, editing, and deletion.
- Seminar management with Leaflet map rendering and daily reminder cron jobs.
- Dynamic Schema Builder (field types incl. Number/File now persist correctly), Collaboration forms, LMS courses, and gamified achievement timelines.
- **Referral & Coin Management System**: multi-level (L1/L2/L3) referral tree, admin-configurable reward amounts, pending-approval workflow, full coin transaction ledger, escrowed seminar reward campaigns, and an admin management UI at `/app/admin/rewards`. See "Coin Wallet & Referral Architecture" above.
- **Full dashboard audit** (User Dashboard + Admin Dashboard) completed: every page/button/API integration traced end-to-end; confirmed bugs fixed (see WORKLOG.md "Known Issues" for what was found but intentionally left for a future pass, and the audit's fix list below).

### In Progress
- Finalizing custom report regeneration context compilation from multi-source queries.
- Optimizing document preview and instant download styling consistency.

### Planned
- Live AWS S3 production storage integration.
- Stripe / Payment Gateway for coin transactions and seminar registrations (the coin wallet service is already payment-method-agnostic and ready for this - see architecture note above).
- Direct export integration (Google Drive / OneDrive).
- Real-time collaborative note-taking.
- Real email delivery (SendGrid or equivalent) for admin user invites and report "Send via Email" - both are currently UI-only with no backend email integration.
- Activity/progress backing for `MyLearningList`/`CourseWorkbook` (currently static mock UI - no enrollment/progress model exists yet).

---

## Protected Files & Directories
*Do not modify without explicit user instruction:*
- `node_modules/` and lockfiles (`package-lock.json`).
- `.git/` directory.
- `backend/.env` (modify only when adding new configuration keys with user confirmation).
- `workers/utils/logo.jpg` (official branding asset).
- Database seeders (`backend/seedTimeline.js`, `backend/createAdmin.js`).
