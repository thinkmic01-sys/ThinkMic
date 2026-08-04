const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { expensiveOperationLimiter } = require('../middleware/rateLimiters');
const { getSummary, regenerateSummary, updateSummary } = require('../controllers/summarizationController');

router.use(protect);

router.get('/transcript/:transcriptId', getSummary);
router.post('/transcript/:transcriptId/regenerate', expensiveOperationLimiter, regenerateSummary);
router.patch('/:id', updateSummary);

module.exports = router;
