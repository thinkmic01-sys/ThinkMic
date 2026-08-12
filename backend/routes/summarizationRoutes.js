const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { expensiveOperationLimiter } = require('../middleware/rateLimiters');
const { getSummary, regenerateSummary, updateSummary, translateSummary, answerIntent } = require('../controllers/summarizationController');

router.use(protect);

router.get('/transcript/:transcriptId', getSummary);
router.post('/transcript/:transcriptId/regenerate', expensiveOperationLimiter, regenerateSummary);
router.post('/transcript/:transcriptId/translate', expensiveOperationLimiter, translateSummary);
router.post('/transcript/:transcriptId/intent', expensiveOperationLimiter, answerIntent);
router.patch('/:id', updateSummary);

module.exports = router;
