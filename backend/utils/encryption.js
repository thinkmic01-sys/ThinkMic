// Field-level encryption for sensitive profile data (KYC ID/passport numbers) using
// Node's built-in crypto module - no new dependency. AES-256-GCM: a random IV per call
// (never reused) plus an auth tag, so tampering with stored ciphertext is detectable.
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

const getKey = () => {
    const raw = process.env.ENCRYPTION_KEY;
    if (!raw) {
        throw new Error('ENCRYPTION_KEY is not configured - required to encrypt/decrypt KYC data.');
    }
    const key = Buffer.from(raw, 'hex');
    if (key.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
    }
    return key;
};

// Returns undefined for empty input so "no value" round-trips as "no value" rather than
// becoming an encrypted empty string.
exports.encrypt = (plainText) => {
    if (plainText === undefined || plainText === null || plainText === '') return undefined;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

exports.decrypt = (payload) => {
    if (!payload) return undefined;
    const [ivHex, tagHex, dataHex] = payload.split(':');
    if (!ivHex || !tagHex || !dataHex) return undefined;
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
};
