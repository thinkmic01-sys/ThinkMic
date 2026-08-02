# WORKLOG.md - Project Progress & Status Log

## Last Updated
2026-08-02

## Current Sprint
- Completed Enterprise Support Experience (Dual-tab Live Chat / Instant Help widget, Quick Topic pre-canned chips with category persistence, user self-resolve flow, 5-star satisfaction rating & feedback API, linkified messages, and socket reconnect resilience).
- Completed Settings Refactor & Notifications Unification (removed API Keys/Branding tabs, added real password change security endpoint, notification preferences persistence, and instant cross-component unread badge sync with Navbar).
- Completed Achievements & Gamified Level Progression system (10-tier progression curve, dynamic streak & weekly activity calendar, live stats, leaderboard medals, and timeline event routing).
- Completed the Referral & Coin Management System (build, harden, and audit passes).
- Completed a full production-readiness audit of both the User Dashboard and Admin Dashboard.

## Completed Features
- **Enterprise Support & Live Chat Widget**: Modern dual-tab slide-out widget (`Live Chat` + `Instant Help` with live-filtered searchable FAQs), 5 one-click Quick Topic prompts (🎙️ Audio, 💰 Coins, 📊 Reports, 🎓 Seminars, ⚙️ Settings), real-time Socket.IO chat with staff role pills & linkified URLs, self-serve ticket resolution (`PATCH /api/v1/support/:id/close`), and interactive 5-star customer satisfaction rating & feedback API (`PATCH /api/v1/support/:id/rate`).
- **Settings & Account Management**: Unified Navbar and Settings panel routing, real password change mechanism (`PATCH /api/v1/auth/change-password` with bcrypt validation and length checks), granular notification preferences (seminar reminders, research alerts, reward updates, system announcements) saved to `User.notificationPrefs`, full notification history feed matching Navbar metadata styling, and real-time cross-component unread sync (`thinkmic:notifications-read` event). Obsolete API Keys and Branding placeholder tabs completely cleaned up.
- **Achievements & Gamification Engine**: 10-tier progressive level scaling (`getLevelInfo` from Level 1 Novice @ 500 XP to Level 10 Grandmaster @ 45,000+ XP), real-time activity streak calculator from live `Transaction`/`TimelineEvent` logs, 7-day visual week calendar widget, dynamic leaderboard with medals (🥇/🥈/🥉), and atomic negative-balance transaction guards (`$gte` checks).
- Dual-engine audio recording (live WebSocket streaming via Deepgram & file upload via OpenAI Whisper).
- BullMQ worker architecture with 4 Redis job queues (transcription, summarization, search, report-generation).
- Real-time progress updates using Socket.IO with Redis Pub/Sub IPC.
- Multi-query deep research engine with Tavily web search.
- PDF and DOCX document generators matching brand identity and typography.
- Reports Library with in-place title/author customization, instant downloads, and report deletion.
- Projects Hub, Research Results workspace, and rich-text Project Notes.
- Seminar management with Leaflet geospatial discovery and automated cron reminders.
- Dynamic Schema Builder, Collaboration submission forms, and LMS Course Workbooks.
- Gamified user achievements and timeline milestone tracking.
- Admin dashboard, user management, and support ticket inbox.
- **Referral & Coin Management System** (multi-level L1/L2/L3 referral tree, admin-configurable reward amounts, pending-approval workflow, coin transaction ledger, escrowed seminar reward campaigns, admin management UI). Load-tested under real concurrency (10 simultaneous joins against a 2-slot seminar campaign resolved to exactly 2 winners, zero overshoot, zero negative balances).
- **Full-application security & bug audit** covering both dashboards - see "Bugs Found & Fixed" below.

## Features In Progress
- Verification and refinement of AI context gathering for edited/regenerated reports across multi-session search results.
- Consistency checks between in-browser document preview and downloaded PDF/DOCX layouts.

## Planned Features
- Production AWS S3 bucket file storage integration.
- Stripe payment gateway integration for coin purchases and seminar bookings.
- Direct cloud storage export (Google Drive / OneDrive).
- Multi-user real-time collaborative note editing.
- Speaker diarization in speech transcription.

## Architecture Decisions
- Heavy AI and search operations are offloaded to asynchronous BullMQ workers rather than blocking HTTP endpoints.
- Client state updates rely on WebSocket event push over Socket.IO instead of aggressive polling.
- Document customization (titles, authors) is processed instantly on the client/worker without triggering unnecessary AI regenerations.
- Double-token authentication strategy: in-memory short-lived access tokens + HttpOnly refresh cookies.
- All coin balance mutations route through `backend/services/coinWalletService.js` (atomic guarded updates only, never a read-modify-write `.save()`) rather than touching `User.coins`/`heldCoins` directly from controllers - this is what made the escrow system safe under concurrent seminar joins.
- `/app/admin/*` routes are guarded both server-side (`checkRole` middleware, the real boundary) and client-side (`RequireRole` wrapper in `App.jsx`, a UX nicety that avoids rendering broken/empty admin UI to unauthorized roles).

## Bugs Found & Fixed (Dashboard Audit, 2026-08-02)
Full end-to-end audit of both dashboards (every page, button, table, form, and API call traced frontend → route → controller → service → model → DB). Real bugs found and fixed:
- **Security - 3x `passwordHash` API leaks**: `adminController.listUsers`, `updateUserRoleStatus`, and `inviteUsers` all returned raw `User` documents (including the bcrypt hash) with no field exclusion. Fixed with `.select('-passwordHash')` / manual field stripping on all three.
- **Security - guessable placeholder password on invited users**: `inviteUsers` set `passwordHash: 'pending'` (a literal, guessable string that gets hashed and would let anyone log into an un-activated invited account with password "pending"). Replaced with a random 32-byte hex placeholder.
- **Real-time chat completely non-functional**: `SupportSidebar.jsx` and `SupportInbox.jsx` emitted a socket event named `join_room`; the server (`backend/utils/socket.js`) only ever listened for `join`. No client ever joined its room, so `io.to(...)` pushes for new support messages silently went nowhere. Fixed the event name on both frontend call sites.
- **Data corruption in Schema Builder**: saving a "Number" or "File" form field silently persisted it as `type: 'text'` (`SchemaBuilder.jsx`'s `mapTypeToDB` had no case for either) - verified live: added a Number field, saved, confirmed via API it now round-trips as `type: 'number'`. Also fixed field icons being dropped when re-opening a schema for editing.
- **AdminDashboard KPIs showed the wrong data**: `GET /analytics/usage` always scoped counts to `req.user._id`, so the *admin's own* personal recording/report/search counts were displayed as if they were platform-wide totals; "Submissions" also duplicated the recordings count instead of querying `Submission`. Fixed to scope by role (admin = platform-wide, regular user = personal, matching both existing call sites' actual intent) and query the real `Submission` model.
- **Dashboard.jsx primary CTAs did nothing**: "New Session", "New Research", "View Reports" header buttons had no `onClick` at all. Wired to `/app/research` and `/app/reports`.
- **Broken navigation**: `ProjectDashboard.jsx`'s recordings table linked to `/app/recorder/:id`, a route that doesn't exist anywhere in the app (no destination page was ever built). Removed the dead link rather than inventing a new detail page.
- **Manager role support-inbox mismatch**: the sidebar shows "Support Inbox" to `admin`+`manager`, but the backend (`getAllTickets`/`closeTicket`) only allowed `admin`, so managers got a silent 403 that looked like an empty inbox. Extended `checkRole` to include `manager`, matching the UI's stated intent.
- **UserTimeline filter chips could never match any event**: filter values (`'Recordings'`, `'Summaries'`) didn't match the real `TimelineEvent.type` enum (`'Recording'` singular, no `'Summaries'` type at all). Corrected the filter list to the real enum.
- **Settings > Profile was entirely fake**: "Save Changes" was a `setTimeout` + `alert()` with no backend route; avatar upload only created a local blob URL, never persisted. Built a real `PATCH /api/v1/users/me` (explicit allowlist: `fullName`/`title`/`preferredLanguage`/`avatarUrl` - role/status/email intentionally excluded) and wired the existing `/upload` endpoint for the avatar. Along the way found and fixed a MongoDB collision: a field literally named `language` conflicts with Mongo's text-index `language_override` mechanism (since `User.fullName` has a text index) - renamed to `preferredLanguage`.
- **Admin invite flow could silently half-fail**: a `for...of User.create()` loop with no per-item error handling meant one duplicate email in a batch invite would 500 the whole request *after* already creating earlier users, telling the admin "failed" when some invites had, in fact, gone through. Now collects per-email success/failure and reports both.
- **NearbySeminars topic filter and Reports delete were non-functional/unsafe**: the topic dropdown had no `onChange` wiring (fixed, now client-side filters against real seminar categories); the seminar distance filter was left as-is (no geo data exists on `Seminar` - would need a new feature). Report deletion had no confirmation dialog before an irreversible action - added `window.confirm`.
- Removed a small amount of confirmed-dead code found along the way (an orphaned `handleFileDrop` referencing an undeclared setter in `Collaboration.jsx`; a computed-but-never-rendered `filteredUsers` in `UserManagement.jsx`).

## Known Issues
- Deepgram live streaming requires a valid API key; falls back to mock token in development.
- AWS S3 service runs in local mock mode until cloud credentials are fully configured.
- **No real email delivery anywhere in the app.** Admin user invites don't send an email (comment in code admits this), and Report Export's "Send via Email" modal is a fully fake `alert()` with an uncontrolled input. Both need a real provider (SendGrid/nodemailer) before they're usable - intentionally not built during the dashboard audit since it requires new external infrastructure and credentials, not just wiring existing code.
- **`MyLearningList.jsx` and `CourseWorkbook.jsx` are 100% static mock UI.** No enrollment/progress model exists in the backend at all; "Continue"/"Submit Module" don't persist anything. Needs a real data model before these can be wired up - out of scope for a bug-fix pass since it's a net-new feature.
- **`TimelineEvent` documents are never created outside a manual seed script** (`backend/seedTimeline.js`, never invoked automatically). The read API and UI are fully correct, but the user timeline is permanently empty for any real user until something actually calls `TimelineEvent.create` from the recording/note/report/seminar flows.
- **AdminDashboard is still mostly decorative.** The core KPI-scoping bug is fixed, but the trend charts, "Top Users" table, per-field completion bars, Recent Activity Log, date-range picker, and all "Export CSV" buttons remain hardcoded/non-functional - each would need a new aggregation endpoint. Flagged as a discrete follow-up project rather than folded into this pass, given the scope.
- **Settings page tabs "Security"/"Notifications"/"Branding"** are honestly labeled "coming soon" - not fixed, no misleading UI here.
- **Settings > API Keys** is fully fake (no backend model/route at all) - same reasoning as email above, left alone.
- **CourseLibrary's live-broadcast "Join"/"Start"/"Resume" buttons are no-ops** - would require real video/streaming infrastructure that doesn't exist; left alone rather than faking it.
- **`GET /analytics/submissions`** exists, is properly role-gated, but returns hardcoded fake numbers (`completionRate: 85`) and nothing in the frontend calls it - dead endpoint, not fixed (no real submission-analytics aggregation was in scope for this pass).

## Pending Refactors
- Clean up unused legacy state variables in `SpeechWorkspace.jsx` and `CreateSeminar.jsx`.
- Standardize modal dialogs and alert banners into reusable shared components across all pages.
- Consider a real "toast" utility shared across pages instead of each page reimplementing the same local toast state/JSX (currently duplicated verbatim in ~8 files).

## Important Notes for Future Development
- Always check BullMQ queue health and Redis connectivity when testing background jobs.
- Maintain Urdu typography line-height rules whenever adding or modifying text components.
- Do not bypass the existing worker queue pipeline for any long-running tasks.
- Any new `User` field must avoid Mongo's reserved text-index field names (`language`, `weights`, etc.) since `User.fullName` has a text index - see `preferredLanguage` for the pattern.
- Any new coin-affecting feature must go through `coinWalletService.js`, never a direct `User.findByIdAndUpdate({$inc:{coins:...}})` - that's how the passwordHash-exclusion and negative-balance guards stay consistent everywhere.
- Before adding a new admin-only frontend page, add both the `checkRole` backend guard *and* a `RequireRole` wrapper in `App.jsx` - the audit found several admin surfaces that had only one or the other.
