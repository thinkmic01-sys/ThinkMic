const crypto = require('crypto');
const r2StorageService = require('./r2StorageService');
const { decrypt } = require('../utils/encryption');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const EXTENSION_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

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
