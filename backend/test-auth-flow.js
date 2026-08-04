/**
 * Standalone end-to-end smoke test for the Auth & Verification system.
 *
 * Requires the backend server to already be running (npm run dev / npm start)
 * and reachable at http://localhost:<PORT>. Reads OTP codes directly from
 * MongoDB (bypassing email delivery) so it works with or without SMTP configured.
 *
 * Usage: node test-auth-flow.js
 */
require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api/v1`;
const RUN_ID = Date.now();

const testUsers = []; // emails to clean up at the end

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`  \x1b[32m✔\x1b[0m ${message}`);
    } else {
        failed++;
        console.log(`  \x1b[31m✘\x1b[0m ${message}`);
    }
}

function section(title) {
    console.log(`\n\x1b[1m${title}\x1b[0m`);
}

async function getUserWithSecrets(email) {
    return User.findOne({ email }).select(
        '+emailVerificationCode +emailVerificationExpires +passwordResetCode +passwordResetExpires'
    );
}

async function testRegisterAndVerify() {
    section('1. Register -> OTP generation -> Verification -> Auto-login');

    const email = `thinkmic.test.verify.${RUN_ID}@example.com`;
    testUsers.push(email);
    const password = 'TestPass123!';

    const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
        email,
        password,
        fullName: 'Test Verify User'
    });

    assert(registerRes.status === 201, 'Register returns 201');
    assert(registerRes.data.requiresVerification === true, 'Register response has requiresVerification: true');

    const dbUser = await getUserWithSecrets(email);
    assert(!!dbUser?.emailVerificationCode, 'A 6-digit verification code was persisted');
    assert(dbUser.status === 'pending_verification' && dbUser.isEmailVerified === false, 'User starts as pending_verification / unverified');

    const verifyRes = await axios.post(`${BASE_URL}/auth/verify-email`, {
        email,
        code: dbUser.emailVerificationCode
    });

    assert(verifyRes.status === 200, 'Verify-email returns 200');
    assert(!!verifyRes.data.accessToken, 'Verify-email auto-issues an access token');
    assert(verifyRes.data.user?.email === email, 'Verify-email response includes the correct user');

    const verifiedDbUser = await User.findOne({ email });
    assert(verifiedDbUser.isEmailVerified === true && verifiedDbUser.status === 'active', 'User is marked verified & active in DB');

    return { email, password };
}

async function testLoginRejectsUnverified() {
    section('2. Login rejection on unverified accounts');

    const email = `thinkmic.test.unverified.${RUN_ID}@example.com`;
    testUsers.push(email);
    const password = 'TestPass123!';

    await axios.post(`${BASE_URL}/auth/register`, { email, password, fullName: 'Test Unverified User' });

    try {
        await axios.post(`${BASE_URL}/auth/login`, { email, password });
        assert(false, 'Login on unverified account should have been rejected');
    } catch (err) {
        assert(err.response?.status === 403, 'Login on unverified account returns 403');
        assert(err.response?.data?.requiresVerification === true, '403 response includes requiresVerification: true');
    }
}

async function testVerifiedUserCanLogin({ email, password }) {
    section('3. Verified user can log in normally');

    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    assert(loginRes.status === 200, 'Login returns 200 for a verified user');
    assert(!!loginRes.data.accessToken, 'Login response includes an access token');
}

async function testGoogleAuthPayloadHandling() {
    section('4. Google Auth payload handling');

    try {
        await axios.post(`${BASE_URL}/auth/google`, { credential: 'not-a-real-google-id-token' });
        assert(false, 'Google auth with a bogus credential should have been rejected');
    } catch (err) {
        assert(err.response?.status === 401, 'Google auth rejects an invalid credential with 401');
    }

    try {
        await axios.post(`${BASE_URL}/auth/google`, {});
        assert(false, 'Google auth with no credential should have been rejected');
    } catch (err) {
        assert(err.response?.status === 400, 'Google auth with missing credential returns 400');
    }
}

async function testPasswordResetFlow({ email }) {
    section('5. Password reset workflow');

    const newPassword = 'NewTestPass456!';

    const forgotRes = await axios.post(`${BASE_URL}/auth/forgot-password`, { email });
    assert(forgotRes.status === 200, 'Forgot-password returns 200');

    const dbUser = await getUserWithSecrets(email);
    assert(!!dbUser?.passwordResetCode, 'A password reset code was persisted');

    const resetRes = await axios.post(`${BASE_URL}/auth/reset-password`, {
        email,
        code: dbUser.passwordResetCode,
        newPassword
    });
    assert(resetRes.status === 200, 'Reset-password returns 200');

    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password: newPassword });
    assert(loginRes.status === 200 && !!loginRes.data.accessToken, 'Can log in with the new password after reset');

    try {
        await axios.post(`${BASE_URL}/auth/login`, { email, password: 'TestPass123!' });
        assert(false, 'Login with the old password should now fail');
    } catch (err) {
        assert(err.response?.status === 401, 'Old password is rejected after reset');
    }
}

async function cleanup() {
    section('Cleanup');
    const res = await User.deleteMany({ email: { $in: testUsers } });
    console.log(`  Removed ${res.deletedCount} test user(s) from the database.`);
}

async function run() {
    console.log(`Running auth flow tests against ${BASE_URL}\n`);

    await mongoose.connect(process.env.DB_URI);

    try {
        const verifiedUser = await testRegisterAndVerify();
        await testLoginRejectsUnverified();
        await testVerifiedUserCanLogin(verifiedUser);
        await testGoogleAuthPayloadHandling();
        await testPasswordResetFlow(verifiedUser);
    } catch (err) {
        failed++;
        console.error('\n\x1b[31mUnexpected error during test run:\x1b[0m', err.response?.data || err.message);
    } finally {
        await cleanup();
        await mongoose.disconnect();
    }

    console.log(`\n\x1b[1mResults: ${passed} passed, ${failed} failed\x1b[0m`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
