/**
 * Standalone end-to-end smoke test for the Cloudflare R2 storage service.
 *
 * Talks directly to R2 via r2StorageService (no running server required).
 * Usage: node test-r2-flow.js
 */
require('dotenv').config();
const axios = require('axios');
const r2 = require('./services/r2StorageService');

const RUN_ID = Date.now();
const TEST_KEY = `thinkmic-test/r2-flow-${RUN_ID}.txt`;
const TEST_CONTENT = `ThinkMic R2 storage test - ${RUN_ID}`;

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

async function testCredentialsAndConnectivity() {
    section('1. Validate R2 credentials & bucket connectivity');

    assert(r2.isR2Configured(), 'R2 environment variables (R2_ACCESS_KEY_ID/SECRET/ENDPOINT/BUCKET) are present');

    // uploadR2Buffer both proves connectivity and seeds the object used by the rest of the suite
    await r2.uploadR2Buffer(TEST_KEY, Buffer.from(TEST_CONTENT), 'text/plain');
    assert(true, 'Connected to the R2 bucket and uploaded a test object via uploadR2Buffer');
}

async function testPresignedUpload() {
    section('2. Generate a presigned upload URL and PUT a buffer directly to R2');

    const uploadKey = `thinkmic-test/r2-flow-presigned-${RUN_ID}.txt`;
    const uploadContent = `Presigned upload test - ${RUN_ID}`;

    const uploadUrl = await r2.getR2UploadPresignedUrl(uploadKey, 'text/plain', 300);
    assert(!!uploadUrl && uploadUrl.startsWith('http'), 'getR2UploadPresignedUrl returns a valid HTTP(S) URL');

    const putRes = await axios.put(uploadUrl, uploadContent, {
        headers: { 'Content-Type': 'text/plain' }
    });
    assert(putRes.status === 200, 'Direct PUT to the presigned URL succeeds');

    return uploadKey;
}

async function testPresignedDownload(key, expectedContent) {
    section('3. Generate a presigned download URL and verify the content');

    const downloadUrl = await r2.getR2DownloadPresignedUrl(key, 3600);
    assert(!!downloadUrl && downloadUrl.startsWith('http'), 'getR2DownloadPresignedUrl returns a valid HTTP(S) URL');

    const getRes = await axios.get(downloadUrl, { responseType: 'text' });
    assert(getRes.status === 200, 'GET on the presigned download URL succeeds');
    assert(getRes.data === expectedContent, 'Downloaded content matches what was uploaded');
}

async function testBufferDownloadHelper(key, expectedContent) {
    section('4. Verify downloadR2ObjectBuffer (used by the transcription worker)');

    const buffer = await r2.downloadR2ObjectBuffer(key);
    assert(Buffer.isBuffer(buffer), 'downloadR2ObjectBuffer returns a Buffer');
    assert(buffer.toString('utf-8') === expectedContent, 'Buffer content matches the original upload');
}

async function testDelete(keys) {
    section('5. Delete test files from R2');

    for (const key of keys) {
        await r2.deleteR2Object(key);
    }
    assert(true, `Deleted ${keys.length} test object(s) from R2`);

    // Confirm deletion: a fresh presigned GET should now 404/NoSuchKey
    try {
        const url = await r2.getR2DownloadPresignedUrl(keys[0], 60);
        await axios.get(url);
        assert(false, 'Deleted object should no longer be downloadable');
    } catch (err) {
        assert(err.response?.status === 404 || err.response?.status === 403, 'Deleted object correctly returns 404/403 on download');
    }
}

async function run() {
    console.log('Running R2 storage flow tests\n');

    const keysToClean = [TEST_KEY];

    try {
        await testCredentialsAndConnectivity();
        const uploadedKey = await testPresignedUpload();
        keysToClean.push(uploadedKey);

        await testPresignedDownload(uploadedKey, `Presigned upload test - ${RUN_ID}`);
        await testBufferDownloadHelper(TEST_KEY, TEST_CONTENT);
        await testDelete(keysToClean);
    } catch (err) {
        failed++;
        console.error('\n\x1b[31mUnexpected error during test run:\x1b[0m', err.response?.data || err.message);
    }

    console.log(`\n\x1b[1mResults: ${passed} passed, ${failed} failed\x1b[0m`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
