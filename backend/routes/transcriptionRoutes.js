const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { expensiveOperationLimiter } = require('../middleware/rateLimiters');
const { getTranscriptStatus, updateTranscript, translateTranscript } = require('../controllers/transcriptionController');

router.use(protect);

// Note: Get status is handled on the recording id, while PATCH is on the transcript id (as per PDF design)
router.patch('/:id', updateTranscript);
router.post('/:id/translate', expensiveOperationLimiter, translateTranscript);

module.exports = router;
