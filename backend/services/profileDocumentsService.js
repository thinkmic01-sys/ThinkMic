const crypto = require('crypto');
const r2StorageService = require('./r2StorageService');
const { decrypt } = require('../utils/encryption');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const EXTENSION_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
// Matches the general document-upload cap elsewhere in the app (uploadRoutes.js) - this is a
// direct client-to-R2 upload (presigned PUT), so unlike a multer route there's no
// server-enforced limit at upload time; see verifyUploadedDocumentSize below.
const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024;

// Presigned upload URL for a KYC document or certification file - private bucket, never a
// public URL. `purpose` only shapes the R2 key path (kyc vs certification) for readability.
exports.getProfileDocumentUploadUrl = async (userId, mimeType, purpose = 'document') => {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        throw new Error('Only JPEG/PNG/WEBP images or PDF files are allowed.');
    }
    if (!r2StorageService.isR2Configured()) {
        throw new Error('File storage is not configured in this environment.');
    }
    const ext = EXTENSION_BY_MIME[mimeType] || 'bin';
    const key = `profile-documents/${userId}/${purpose}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const uploadUrl = await r2StorageService.getR2UploadPresignedUrl(key, mimeType, 300);
    return { uploadUrl, key };
};

// A presigned PUT URL has no server-enforced size cap the way a multer route does, so this
// checks the real uploaded object's size after the fact (called from updateMe, right before
// a new key is persisted onto the user's profile) - deletes and rejects anything oversized
// or missing instead of trusting it silently. Only meant to run against keys under this
// user's own profile-documents/{userId}/ prefix.
exports.verifyUploadedDocumentSize = async (key) => {
    const size = await r2StorageService.getR2ObjectSize(key);
    if (size === null) {
        throw new Error('Uploaded file could not be found - please try uploading again.');
    }
    if (size > MAX_DOCUMENT_SIZE_BYTES) {
        await r2StorageService.deleteR2Object(key).catch(() => {});
        throw new Error(`Uploaded file exceeds the ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}MB limit.`);
    }
};

// Shapes a User document's KYC sub-object into a response-safe form: decrypts the ID
// number and resolves the private R2 key into a short-lived presigned GET URL. The caller
// must have fetched the user with .select('+kyc.idNumberEncrypted') for idNumber to be
// present here - shared by userController (self) and adminUserDetailController (admin) so
// the two views can never drift out of sync with each other.
exports.shapeKyc = async (user) => {
    if (!user.kyc) return { idType: undefined, idNumber: undefined, idDocumentUrl: undefined };
    let idDocumentUrl;
    if (user.kyc.idDocumentKey && r2StorageService.isR2Configured()) {
        try {
            idDocumentUrl = await r2StorageService.getR2DownloadPresignedUrl(user.kyc.idDocumentKey);
        } catch (err) {
            console.error('KYC document presign error:', err.message);
        }
    }
    return {
        idType: user.kyc.idType,
        idNumber: decrypt(user.kyc.idNumberEncrypted),
        idDocumentUrl
    };
};

exports.shapeCertifications = async (certifications) => {
    return Promise.all((certifications || []).map(async (cert) => {
        const plain = cert.toObject ? cert.toObject() : cert;
        let certificateUrl;
        if (plain.certificateKey && r2StorageService.isR2Configured()) {
            try {
                certificateUrl = await r2StorageService.getR2DownloadPresignedUrl(plain.certificateKey);
            } catch (err) {
                console.error('Certification file presign error:', err.message);
            }
        }
        return { ...plain, certificateUrl };
    }));
};
