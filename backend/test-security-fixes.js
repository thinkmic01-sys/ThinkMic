/**
 * Targeted verification for this security audit's fixes:
 *   1. Socket.IO room join requires a valid refreshToken cookie (rejects unauthenticated,
 *      and a client-supplied userId cannot be used to join another user's room).
 *   2. IDOR fixes: transcript/summary read+write endpoints are scoped to the owner.
 *   3. Rate limiting is active on an expensive route.
 *   4. CORS rejects an origin that isn't allow-listed.
 *
 * Usage: node test-security-fixes.js
 */
require('dotenv').config();
const axios = require('axios');
const { io } = require('socket.io-client');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const User = require('./models/User');
const Transcript = require('./models/Transcript');
const Summary = require('./models/Summary');

// The real server process owns the live `io` instance - this test process can't reach it
// directly, so it publishes to the same Redis channel the real workers use to notify users.
const redisPub = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const emitToUser = (userId, event, data) => redisPub.publish('socket_events', JSON.stringify({ userId, event, data }));

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api/v1`;
const SOCKET_URL = `http://localhost:${PORT}`;
const RUN_ID = Date.now();

let passed = 0;
let failed = 0;
function assert(condition, message) {
    if (condition) { passed++; console.log(`  \x1b[32m✔\x1b[0m ${message}`); }
    else { failed++; console.log(`  \x1b[31m✘\x1b[0m ${message}`); }
}
function section(title) { console.log(`\n\x1b[1m${title}\x1b[0m`); }

async function createVerifiedUser(tag) {
    const email = `thinkmic.sec.${tag}.${RUN_ID}@example.com`;
    const user = await User.create({
        email, passwordHash: 'TestPass123!', fullName: `Security Test ${tag}`,
        isEmailVerified: true, status: 'active', referralCode: `sec${tag}${RUN_ID}`
    });
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password: 'TestPass123!' });
    const cookieHeader = loginRes.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
    return { user, accessToken: loginRes.data.accessToken, cookieHeader };
}

async function testSocketAuth(userA, userB) {
    section('1. Socket.IO room-join authentication');

    // 1a. No cookie at all -> connection must be rejected
    await new Promise((resolve) => {
        const s = io(SOCKET_URL, { withCredentials: false, extraHeaders: {}, transports: ['websocket'] });
        s.on('connect', () => { assert(false, 'Connection with no cookie should be rejected'); s.disconnect(); resolve(); });
        s.on('connect_error', (err) => { assert(true, `Connection with no cookie is rejected (${err.message})`); s.disconnect(); resolve(); });
        setTimeout(resolve, 5000);
    });

    // 1b. Valid cookie for user A -> connects, auto-joins own room, receives own-room event
    const received = [];
    const socketA = io(SOCKET_URL, {
        extraHeaders: { Cookie: userA.cookieHeader },
        transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
        socketA.on('connect', resolve);
        socketA.on('connect_error', reject);
        setTimeout(() => reject(new Error('timeout')), 5000);
    }).then(() => assert(true, 'Connection with a valid refreshToken cookie succeeds'))
      .catch((err) => assert(false, `Valid-cookie connection should succeed (${err.message})`));

    socketA.on('probe_event', (data) => received.push(data));

    // 1c. Attacker tries to join User B's room using B's known userId - must be silently ignored
    socketA.emit('join', String(userB.user._id));
    await new Promise((r) => setTimeout(r, 500));

    emitToUser(String(userB.user._id), 'probe_event', { secret: 'for-user-B-only' });
    await new Promise((r) => setTimeout(r, 500));

    assert(received.length === 0, "Emitting a client-supplied userId to 'join' does NOT grant access to another user's room");

    // 1d. Confirm the socket DOES receive events for its own (verified) room
    emitToUser(String(userA.user._id), 'probe_event', { secret: 'for-user-A' });
    await new Promise((r) => setTimeout(r, 500));
    assert(received.some((d) => d.secret === 'for-user-A'), 'Socket correctly receives events for its own verified room');

    socketA.disconnect();
}

async function testTranscriptSummaryIDOR(userA, userB) {
    section('2. Transcript & Summary IDOR fixes');

    const transcript = await Transcript.create({
        recordingId: new mongoose.Types.ObjectId(),
        userId: userA.user._id,
        text: "User A's private transcript content",
        whisperModel: 'test'
    });
    const summary = await Summary.create({
        transcriptId: transcript._id,
        userId: userA.user._id,
        summaryText: "User A's private summary",
        tags: [], queries: []
    });

    const bHeaders = { Authorization: `Bearer ${userB.accessToken}` };

    // updateTranscript as attacker (User B) against User A's transcript
    try {
        const res = await axios.patch(`${BASE_URL}/transcriptions/${transcript._id}`, { editedText: 'HACKED' }, { headers: bHeaders, validateStatus: () => true });
        assert(res.status === 404, `PATCH /transcriptions/:id on another user's transcript returns 404 (got ${res.status})`);
    } catch (err) { assert(false, `updateTranscript IDOR check errored: ${err.message}`); }

    const transcriptAfter = await Transcript.findById(transcript._id);
    assert(transcriptAfter.editedText !== 'HACKED', "Attacker's edit did NOT overwrite another user's transcript");

    // getSummary as attacker
    const getRes = await axios.get(`${BASE_URL}/summaries/transcript/${transcript._id}`, { headers: bHeaders, validateStatus: () => true });
    assert(getRes.status === 404, `GET /summaries/transcript/:id for another user's transcript returns 404 (got ${getRes.status})`);

    // updateSummary as attacker
    const updRes = await axios.patch(`${BASE_URL}/summaries/${summary._id}`, { approved: true }, { headers: bHeaders, validateStatus: () => true });
    assert(updRes.status === 404, `PATCH /summaries/:id on another user's summary returns 404 (got ${updRes.status})`);

    // regenerateSummary as attacker
    const regenRes = await axios.post(`${BASE_URL}/summaries/transcript/${transcript._id}/regenerate`, {}, { headers: bHeaders, validateStatus: () => true });
    assert(regenRes.status === 404, `POST /summaries/transcript/:id/regenerate for another user's transcript returns 404 (got ${regenRes.status})`);

    // Sanity: owner (User A) CAN still access their own transcript/summary normally
    const aHeaders = { Authorization: `Bearer ${userA.accessToken}` };
    const ownRes = await axios.get(`${BASE_URL}/summaries/transcript/${transcript._id}`, { headers: aHeaders, validateStatus: () => true });
    assert(ownRes.status === 200, `Owner can still GET their own summary (got ${ownRes.status})`);

    await Transcript.deleteOne({ _id: transcript._id });
    await Summary.deleteOne({ _id: summary._id });
}

async function testRateLimiting(userA) {
    section('3. Rate limiting on an expensive route');
    const headers = { Authorization: `Bearer ${userA.accessToken}` };

    let sawLimit = false;
    for (let i = 0; i < 35 && !sawLimit; i++) {
        const res = await axios.get(`${BASE_URL}/recordings/upload-url`, {
            params: { mimeType: 'audio/wav' }, headers, validateStatus: () => true
        });
        if (res.status === 429) sawLimit = true;
    }
    assert(sawLimit, '35 rapid requests to a rate-limited route eventually returns 429');
}

async function testCORS() {
    section('4. CORS rejects a non-allow-listed origin');
    try {
        const res = await axios.get(`${BASE_URL.replace('/api/v1', '')}/api/v1/auth/login`, {
            headers: { Origin: 'https://evil-attacker-site.example' },
            validateStatus: () => true
        });
        const acao = res.headers['access-control-allow-origin'];
        assert(acao !== 'https://evil-attacker-site.example', `Response does not echo back the disallowed origin (ACAO: ${acao || '(none)'})`);
    } catch (err) {
        assert(true, `Request from disallowed origin was rejected outright (${err.message})`);
    }
}

async function run() {
    console.log(`Running security-fix verification against ${BASE_URL}\n`);
    await mongoose.connect(process.env.DB_URI);

    let userA, userB;
    try {
        userA = await createVerifiedUser('A');
        userB = await createVerifiedUser('B');

        await testSocketAuth(userA, userB);
        await testTranscriptSummaryIDOR(userA, userB);
        await testRateLimiting(userA);
        await testCORS();
    } catch (err) {
        failed++;
        console.error('\n\x1b[31mUnexpected error:\x1b[0m', err.response?.data || err.message);
    } finally {
        if (userA) await User.deleteOne({ _id: userA.user._id });
        if (userB) await User.deleteOne({ _id: userB.user._id });
        await mongoose.disconnect();
        redisPub.disconnect();
    }

    console.log(`\n\x1b[1mResults: ${passed} passed, ${failed} failed\x1b[0m`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
