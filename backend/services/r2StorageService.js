// backend/services/r2StorageService.js
//
// Dedicated Cloudflare R2 object storage service. R2 exposes an S3-compatible
// API, so we reuse @aws-sdk/client-s3 pointed at the account's R2 endpoint
// instead of AWS - everything else (presigning, buffers, deletes) works the
// same way it would against real S3.

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const isR2Configured = () => !!(
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_ENDPOINT &&
    process.env.R2_BUCKET_NAME
);

let client = null;
const getClient = () => {
    if (!isR2Configured()) {
        throw new Error('R2 is not configured. Missing one of R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_ENDPOINT/R2_BUCKET_NAME.');
    }
    if (!client) {
        client = new S3Client({
            region: process.env.R2_REGION || 'auto',
            endpoint: process.env.R2_ENDPOINT,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
            },
            // R2 doesn't support the AWS SDK v3 default flexible-checksum (aws-chunked)
            // upload encoding, which otherwise causes a SignatureDoesNotMatch error.
            requestChecksumCalculation: 'WHEN_REQUIRED',
            responseChecksumValidation: 'WHEN_REQUIRED'
        });
    }
    return client;
};

// Presigned PUT URL for a direct browser-to-R2 upload (audio recordings)
async function getR2UploadPresignedUrl(key, mimeType, expiresIn = 300) {
    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        ContentType: mimeType
    });
    return getSignedUrl(getClient(), command, { expiresIn });
}

// Presigned GET URL for secure, time-limited playback/download streaming
async function getR2DownloadPresignedUrl(key, expiresIn = 3600) {
    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key
    });
    return getSignedUrl(getClient(), command, { expiresIn });
}

// Uploads a server-rendered buffer (generated PDF/DOCX) directly to R2
async function uploadR2Buffer(key, buffer, contentType) {
    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType
    });
    return getClient().send(command);
}

// Downloads an object into an in-memory Buffer - used by the transcription
// worker to pull R2-uploaded audio before handing it to Whisper.
async function downloadR2ObjectBuffer(key) {
    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key
    });
    const response = await getClient().send(command);
    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function deleteR2Object(key) {
    const command = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key
    });
    return getClient().send(command);
}

module.exports = {
    isR2Configured,
    getR2UploadPresignedUrl,
    getR2DownloadPresignedUrl,
    uploadR2Buffer,
    downloadR2ObjectBuffer,
    deleteR2Object
};
