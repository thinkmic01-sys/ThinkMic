const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { getMyRecordings, uploadAudioLocal, getRecordingById, getUploadUrl, createRecordingDraft, deleteRecording, initLiveSession } = require('../controllers/recordingController');
const { protect } = require('../middleware/authMiddleware');
const { expensiveOperationLimiter } = require('../middleware/rateLimiters');

// Ensure 'uploads' directory exists on your local machine
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure Multer local storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // Create a unique filename: timestamp-userid.ext
        const ext = file.mimetype.split('/')[1].split(';')[0];
        cb(null, `local-${Date.now()}-${req.user._id}.${ext}`);
    }
});

// Only accept real audio files - covers every codec our cross-browser MediaRecorder fallback
// chain can produce (webm/opus, mp4, aac, ogg) plus common uploaded file formats (mp3, wav, m4a)
const audioFileFilter = (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('INVALID_FILE_TYPE'), false);
    }
};

// Initialize multer with a 50MB file size limit
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: audioFileFilter
});

// Wraps multer so upload errors (file too large, wrong type) return clean JSON instead of
// bubbling up to Express's default HTML error page
const handleAudioUpload = (req, res, next) => {
    upload.single('audio')(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'Audio file exceeds the 50MB limit.' });
            }
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        }
        if (err.message === 'INVALID_FILE_TYPE') {
            return res.status(400).json({ message: 'Invalid file type. Please upload a valid audio file (webm, mp4, aac, ogg, mp3, wav, or m4a).' });
        }

        console.error('Recording upload error:', err);
        return res.status(500).json({ message: 'Server Error processing upload', error: err.message });
    });
};

// Protect all routes
router.use(protect);

// Presigned R2 upload URL generator (falls back to { storage: 'local' } if R2 isn't configured)
router.get('/upload-url', expensiveOperationLimiter, getUploadUrl);

// Finalizes a recording after a direct R2 upload completes
router.post('/draft', expensiveOperationLimiter, createRecordingDraft);

// Creates a placeholder Recording + empty Transcript the moment a live recording starts,
// so the transcript text can be autosaved (PATCH /transcriptions/:id) as it streams in
router.post('/live/start', initLiveSession);

// Our new Local Upload route. Multer handles the file labeled 'audio' in the form data
router.post('/', expensiveOperationLimiter, handleAudioUpload, uploadAudioLocal);

// Get recordings
router.get('/', getMyRecordings);

// Get a single recording (with transcript + summary populated), for session resumption
router.get('/:id', getRecordingById);

// Cascade-deletes the recording plus its transcript, summary, and any derived reports
router.delete('/:id', deleteRecording);

module.exports = router;