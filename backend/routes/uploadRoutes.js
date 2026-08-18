const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const { expensiveOperationLimiter } = require('../middleware/rateLimiters');

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename(req, file, cb) {
        cb(null, `image-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

router.post('/', protect, expensiveOperationLimiter, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    // Derived from the actual incoming request rather than hardcoded, so this resolves
    // correctly in any environment (dev, staging, production) without configuration -
    // callers (Settings avatar, seminar images) store this URL as-is and render it directly.
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// General-purpose document upload (seminar supporting material: slides, notes, PDFs, etc.)
// - unlike the image-only uploader above, any common document/archive type is accepted.
// Not audio - pre-recorded seminar audio goes through POST /api/v1/recordings instead, so
// it gets transcribed via the existing Whisper pipeline rather than just stored as a file.
const documentStorage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename(req, file, cb) {
        cb(null, `doc-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'image/png',
    'image/jpeg'
]);

const uploadDocument = multer({
    storage: documentStorage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
    fileFilter: (req, file, cb) => {
        if (ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type. Upload a PDF, Word/PowerPoint/Excel document, text file, ZIP, or image.'), false);
        }
    }
});

router.post('/document', protect, expensiveOperationLimiter, (req, res) => {
    uploadDocument.single('document')(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.json({ url: fileUrl, name: req.file.originalname });
    });
});

module.exports = router;
