const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { expensiveOperationLimiter } = require('../middleware/rateLimiters');
const { getSummary, regenerateSummary, updateSummary, translateSummary } = require('../controllers/summarizationController');

router.use(protect);

router.get('/transcript/:transcriptId', getSummary);
router.post('/transcript/:transcriptId/regenerate', expensiveOperationLimiter, regenerateSummary);
router.post('/transcript/:transcriptId/translate', expensiveOperationLimiter, translateSummary);
router.patch('/:id', updateSummary);

module.exports = router;
