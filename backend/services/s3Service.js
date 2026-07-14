// backend/services/s3Service.js

/**
 * Service Abstraction for AWS S3
 * Incorporates the "Tomorrow" Constraint for MOCK testing.
 */

const isMock = !process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'MOCK';

exports.generatePresignedUrl = async (userId, mimeType) => {
    if (isMock) {
        console.log(`[MOCK] Generating presigned URL for user ${userId}`);
        const ext = mimeType.split('/')[1].split(';')[0];
        return {
            uploadUrl: `http://localhost:5000/api/v1/mock-s3-upload`,
            s3Key: `recordings/${userId}/mock-uuid-${Date.now()}.${ext}`
        };
    }

    // Production AWS S3 presigned URL logic
};
