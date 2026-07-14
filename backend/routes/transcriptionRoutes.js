const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getTranscriptStatus, updateTranscript } = require('../controllers/transcriptionController');

router.use(protect);

// Note: Get status is handled on the recording id, while PATCH is on the transcript id (as per PDF design)
router.patch('/:id', updateTranscript);

module.exports = router;
