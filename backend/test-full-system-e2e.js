/**
 * Master end-to-end system verification & storage architecture audit.
 *
 * Drives the REAL pipeline against the live MongoDB Atlas database, live
 * Cloudflare R2 bucket, and live AI providers (Whisper/GPT/Claude) - no mocks,
 * no shortcuts. Requires, running concurrently:
 *   - the backend server   (node server.js)
 *   - the BullMQ workers    (node worker.js)
 *
 * Usage: node test-full-system-e2e.js
 */
require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

const User = require('./models/User');
const Recording = require('./models/Recording');
const Transcript = require('./models/Transcript');
const Summary = require('./models/Summary');
const Report = require('./models/Report');
const r2 = require('./services/r2StorageService');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api/v1`;
const RUN_ID = Date.now();

let passed = 0;
let failed = 0;
const auditNotes = [];

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`  \x1b[32m✔\x1b[0m ${message}`);
    } else {
        failed++;
        console.log(`  \x1b[31m✘\x1b[0m ${message}`);
    }
}

function note(label, detail) {
    auditNotes.push({ label, detail });
    console.log(`  \x1b[36mℹ\x1b[0m ${label}: ${detail}`);
}

function section(title) {
    console.log(`\n\x1b[1m${title}\x1b[0m`);
}

// --- Synthesizes a short, valid, real WAV file in pure Node (no ffmpeg dependency).
// Empirically verified: OpenAI Whisper reliably transcribes a pure tone (returns
// non-empty text, e.g. "Beep."), so this drives a real transcription, not a mock.
function generateTestWavBuffer(durationSeconds = 2, sampleRate = 16000, freq = 440) {
    const numSamples = durationSeconds * sampleRate;
    const dataSize = numSamples * 2; // 16-bit mono
    const buffer = Buffer.alloc(44 + dataSize);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    for (let i = 0; i < numSamples; i++) {
        const sample = Math.sin(2 * Math.PI * freq * i / sampleRate) * 0.5 * 32767;
        buffer.writeInt16LE(Math.round(sample), 44 + i * 2);
    }
    return buffer;
}

async function waitFor(checkFn, { timeoutMs = 60000, intervalMs = 3000, label = 'condition' } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const result = await checkFn();
        if (result) return result;
        await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${label}`);
}

// ============================================================
// PHASE 1: Auth & User Lifecycle
// ============================================================
async function phase1Auth() {
    section('PHASE 1: Auth & User Lifecycle (Register -> OTP -> Login -> Refresh -> Google)');

    const email = `thinkmic.e2e.${RUN_ID}@example.com`;
    const password = 'E2ETestPass123!';

    const registerRes = await axios.post(`${BASE_URL}/auth/register`, { email, password, fullName: 'E2E Test User' });
    assert(registerRes.status === 201 && registerRes.data.requiresVerification === true, 'Register succeeds and requires verification');

    const dbUserPending = await User.findOne({ email }).select('+emailVerificationCode');
    assert(!!dbUserPending?.emailVerificationCode, 'OTP code persisted in MongoDB Atlas');

    const verifyRes = await axios.post(`${BASE_URL}/auth/verify-email`, { email, code: dbUserPending.emailVerificationCode });
    assert(verifyRes.status === 200 && !!verifyRes.data.accessToken, 'Verify-email succeeds and auto-issues an access token');

    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    assert(loginRes.status === 200 && !!loginRes.data.accessToken, 'Login succeeds post-verification');
    let accessToken = loginRes.data.accessToken;

    const setCookie = loginRes.headers['set-cookie'] || [];
    const refreshCookie = setCookie.find((c) => c.startsWith('refreshToken='));
    assert(!!refreshCookie, 'Login sets an HttpOnly refreshToken cookie');

    const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, {}, { headers: { Cookie: refreshCookie } });
    assert(refreshRes.status === 200 && !!refreshRes.data.accessToken, 'POST /auth/refresh exchanges the cookie for a fresh access token');
    accessToken = refreshRes.data.accessToken;

    try {
        await axios.post(`${BASE_URL}/auth/google`, { credential: 'not-a-real-google-id-token' });
        assert(false, 'Google auth with a bogus credential should have been rejected');
    } catch (err) {
        assert(err.response?.status === 401, 'Google auth validates ID tokens against Google and rejects invalid ones (401)');
    }

    const dbUserFinal = await User.findOne({ email });
    assert(dbUserFinal.isEmailVerified === true && dbUserFinal.status === 'active', 'User is verified & active in Atlas after the full lifecycle');

    return { email, accessToken, userId: dbUserFinal._id };
}

// ============================================================
// PHASE 2: R2 Audio Ingestion & Transcription
// ============================================================
async function phase2Recording(accessToken) {
    section('PHASE 2: R2 Audio Ingestion & BullMQ Transcription');
    const authHeaders = { Authorization: `Bearer ${accessToken}` };

    const uploadUrlRes = await axios.get(`${BASE_URL}/recordings/upload-url`, {
        params: { mimeType: 'audio/wav' },
        headers: authHeaders
    });
    assert(uploadUrlRes.status === 200 && uploadUrlRes.data.storage === 'r2', 'GET /recordings/upload-url issues a presigned R2 PUT URL');
    const { uploadUrl, r2Key, recordingId } = uploadUrlRes.data;
    assert(!!recordingId, 'Server pre-issues a recordingId tied to the upload');
    assert(/^recordings\/[a-f0-9]{24}\/[a-f0-9]{24}\.\w+$/i.test(r2Key) && r2Key.includes(String(recordingId)),
        `R2 key follows the recordings/{userId}/{recordingId}.ext tenant-isolation hierarchy (got "${r2Key}")`);

    const audioBuffer = generateTestWavBuffer();
    const putRes = await axios.put(uploadUrl, audioBuffer, { headers: { 'Content-Type': 'audio/wav' } });
    assert(putRes.status === 200, 'Direct PUT of a real test WAV to the presigned R2 URL succeeds');

    const draftRes = await axios.post(`${BASE_URL}/recordings/draft`, {
        recordingId, r2Key, title: 'E2E Test Recording', mimeType: 'audio/wav', fileSizeBytes: audioBuffer.length, language: 'en-US'
    }, { headers: authHeaders });
    assert(draftRes.status === 201, 'POST /recordings/draft finalizes the recording');
    const finalRecordingId = draftRes.data.recording._id;
    assert(String(finalRecordingId) === String(recordingId), "Finalized Recording's Mongo _id matches the pre-issued recordingId (R2 key <-> document are in sync)");

    const transcript = await waitFor(
        () => Transcript.findOne({ recordingId: finalRecordingId }),
        { timeoutMs: 90000, intervalMs: 3000, label: 'transcription BullMQ worker to produce a Transcript' }
    );
    assert(!!transcript, 'Transcript document created in Atlas by the transcription worker');
    assert(typeof transcript.text === 'string' && transcript.text.trim().length > 0, `Transcript has non-empty real Whisper text: "${transcript.text.trim()}"`);

    const getRecRes = await axios.get(`${BASE_URL}/recordings/${finalRecordingId}`, { headers: authHeaders });
    assert(getRecRes.status === 200, 'GET /recordings/:id succeeds');
    const playbackUrl = getRecRes.data.recording.playbackUrl;
    assert(!!playbackUrl && playbackUrl.includes('r2.cloudflarestorage.com'), 'Recording retrieval attaches a presigned R2 playbackUrl');

    const streamRes = await axios.get(playbackUrl, { responseType: 'arraybuffer' });
    assert(Buffer.compare(Buffer.from(streamRes.data), audioBuffer) === 0, 'playbackUrl streams back the exact bytes that were uploaded');

    return { recordingId: finalRecordingId, r2Key, transcriptId: transcript._id };
}

// ============================================================
// PHASE 3: AI Summarization
// ============================================================
async function phase3Summary(transcriptId) {
    section('PHASE 3: AI Summarization (real OpenAI/Anthropic pipeline)');

    const summary = await waitFor(
        () => Summary.findOne({ transcriptId }),
        { timeoutMs: 60000, intervalMs: 3000, label: 'summarization BullMQ worker to produce a Summary' }
    );

    assert(!!summary, 'Summary document created in Atlas');
    assert(typeof summary.summaryText === 'string' && summary.summaryText.length > 20, 'Summary has a substantive summaryText (Executive Summary)');
    assert(Array.isArray(summary.tags), 'Summary has a tags array (Key Topics)');
    assert(Array.isArray(summary.queries), 'Summary has a queries array (suggested follow-ups)');

    // The Summary schema stores one prose block, not discrete Action Items/Key
    // Decisions/Meeting Minutes fields - note this for the audit rather than
    // asserting on it (a flaky keyword match would make the suite non-deterministic).
    note('Summary schema shape', 'summaryText/tags/queries only - no discrete actionItems/keyDecisions fields exist today; those concepts (if present) live as prose inside summaryText.');

    return summary;
}

// ============================================================
// PHASE 4: AI Queries / Search + Index Audit
// ============================================================
async function phase4Queries(accessToken, userId, recordingId) {
    section('PHASE 4: Retrieval by User/Recording ID + Compound Index Audit');
    const authHeaders = { Authorization: `Bearer ${accessToken}` };

    const listRes = await axios.get(`${BASE_URL}/recordings`, { headers: authHeaders });
    assert(listRes.status === 200 && listRes.data.recordings.some((r) => r._id === String(recordingId)), 'GET /recordings (by user) lists the created recording');

    const detailRes = await axios.get(`${BASE_URL}/recordings/${recordingId}`, { headers: authHeaders });
    assert(detailRes.status === 200 && !!detailRes.data.recording.transcriptId, 'GET /recordings/:id returns the populated transcript reference');

    // Prove the compound indexes are actually used (IXSCAN, not a full COLLSCAN)
    const recExplain = await Recording.find({ userId }).sort({ createdAt: -1 }).explain('executionStats');
    const recStage = JSON.stringify(recExplain.executionStats?.executionStages || recExplain.queryPlanner);
    assert(recStage.includes('IXSCAN'), 'Recording.find({userId}).sort({createdAt:-1}) uses an index scan (IXSCAN), not a collection scan');

    const transcriptExplain = await Transcript.find({ userId }).sort({ createdAt: -1 }).explain('executionStats');
    const transcriptStage = JSON.stringify(transcriptExplain.executionStats?.executionStages || transcriptExplain.queryPlanner);
    assert(transcriptStage.includes('IXSCAN'), 'Transcript.find({userId}).sort({createdAt:-1}) uses an index scan (IXSCAN)');

    const reportExplain = await Report.find({ userId }).sort({ createdAt: -1 }).explain('executionStats');
    const reportStage = JSON.stringify(reportExplain.executionStats?.executionStages || reportExplain.queryPlanner);
    assert(reportStage.includes('IXSCAN'), 'Report.find({userId}).sort({createdAt:-1}) uses an index scan (IXSCAN)');
}

// ============================================================
// PHASE 5: Report Generation & R2 Export
// ============================================================
async function phase5Report(accessToken, summary) {
    section('PHASE 5: Document Generation & R2 Cloud Export');
    const authHeaders = { Authorization: `Bearer ${accessToken}` };

    const createRes = await axios.post(`${BASE_URL}/reports`, {
        title: 'E2E Test Report',
        summaryId: summary._id,
        template: 'standard',
        sections: { summary: true, transcript: true, research: false, sources: false }
    }, { headers: authHeaders });
    assert(createRes.status === 202 && !!createRes.data.reportId, 'POST /reports enqueues a report-generation job');
    const reportId = createRes.data.reportId;

    const report = await waitFor(
        async () => {
            const r = await Report.findById(reportId);
            return r && (r.status === 'completed' || r.status === 'failed') ? r : null;
        },
        { timeoutMs: 120000, intervalMs: 4000, label: 'report-generation BullMQ worker to finish' }
    );

    assert(report.status === 'completed', `Report generation completed (status=${report.status})`);
    assert(!!report.pdfR2Key, 'Generated PDF was mirrored to R2 (pdfR2Key set on the Report doc)');
    assert(!!report.docxR2Key, 'Generated DOCX was mirrored to R2 (docxR2Key set on the Report doc)');

    const pdfBuffer = await r2.downloadR2ObjectBuffer(report.pdfR2Key);
    const docxBuffer = await r2.downloadR2ObjectBuffer(report.docxR2Key);
    assert(pdfBuffer.length > 1000, `PDF exists in R2 with a valid byte length (${pdfBuffer.length} bytes)`);
    assert(docxBuffer.length > 1000, `DOCX exists in R2 with a valid byte length (${docxBuffer.length} bytes)`);

    const downloadRes = await axios.get(`${BASE_URL}/reports/${reportId}/download/pdf`, {
        headers: authHeaders,
        maxRedirects: 0,
        validateStatus: () => true
    });
    assert(downloadRes.status === 302 && (downloadRes.headers.location || '').includes('r2.cloudflarestorage.com'),
        'GET /reports/:id/download/pdf returns a 302 redirect to a presigned R2 URL');

    return { reportId, pdfR2Key: report.pdfR2Key, docxR2Key: report.docxR2Key };
}

// ============================================================
// PHASE 6: Cascading Cleanup (zero orphan storage)
// ============================================================
async function phase6Cleanup(accessToken, { recordingId, r2Key, transcriptId }, { reportId, pdfR2Key, docxR2Key }, email) {
    section('PHASE 6: Cascading Deletion (zero orphan storage audit)');
    const authHeaders = { Authorization: `Bearer ${accessToken}` };

    const summaryBefore = await Summary.findOne({ transcriptId });

    const delRes = await axios.delete(`${BASE_URL}/recordings/${recordingId}`, { headers: authHeaders });
    assert(delRes.status === 200, 'DELETE /recordings/:id succeeds');
    assert(delRes.data.deleted?.reports >= 1, `Cascade response reports ${delRes.data.deleted?.reports} linked report(s) cleaned up`);

    assert(!(await Recording.findById(recordingId)), 'Recording document removed from Atlas');
    assert(!(await Transcript.findOne({ recordingId })), 'Transcript document removed from Atlas');
    assert(!(await Report.findById(reportId)), 'Report document removed from Atlas (matched via summaryId, not just recordingId)');
    if (summaryBefore) {
        assert(!(await Summary.findById(summaryBefore._id)), 'Summary document removed from Atlas');
    }

    for (const [label, key] of [['audio', r2Key], ['PDF', pdfR2Key], ['DOCX', docxR2Key]]) {
        try {
            await r2.downloadR2ObjectBuffer(key);
            assert(false, `${label} object should no longer exist in R2`);
        } catch (err) {
            assert(true, `${label} object is gone from R2 (cascade delete confirmed)`);
        }
    }

    await User.deleteOne({ email });
    assert(!(await User.findOne({ email })), 'Test user removed from Atlas');
}

// ============================================================
async function run() {
    console.log(`Running FULL SYSTEM E2E verification against ${BASE_URL}\n`);
    await mongoose.connect(process.env.DB_URI);

    let email;
    try {
        const auth = await phase1Auth();
        email = auth.email;

        const recording = await phase2Recording(auth.accessToken);
        const summary = await phase3Summary(recording.transcriptId);
        await phase4Queries(auth.accessToken, auth.userId, recording.recordingId);
        const report = await phase5Report(auth.accessToken, summary);
        await phase6Cleanup(auth.accessToken, recording, report, email);
    } catch (err) {
        failed++;
        console.error('\n\x1b[31mUnexpected error during test run:\x1b[0m', err.response?.data || err.message);
        if (email) {
            await User.deleteOne({ email }).catch(() => {});
        }
    }

    section('STORAGE AUDIT SUMMARY');
    auditNotes.forEach((n) => console.log(`  - ${n.label}: ${n.detail}`));

    await mongoose.disconnect();
    console.log(`\n\x1b[1mResults: ${passed} passed, ${failed} failed\x1b[0m`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
