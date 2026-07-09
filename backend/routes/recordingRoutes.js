const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { getMyRecordings, uploadAudioLocal } = require('../controllers/recordingController');
const { protect } = require('../middleware/authMiddleware');

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

// Initialize multer with a 50MB file size limit
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Protect all routes
router.use(protect);

// Our new Local Upload route. Multer handles the file labeled 'audio' in the form data
router.post('/upload-local', upload.single('audio'), uploadAudioLocal);

// Get recordings
router.get('/', getMyRecordings);

module.exports = router;