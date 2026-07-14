const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getSummary, regenerateSummary, updateSummary } = require('../controllers/summarizationController');

router.use(protect);

router.get('/transcript/:transcriptId', getSummary);
router.post('/transcript/:transcriptId/regenerate', regenerateSummary);
router.patch('/:id', updateSummary);

module.exports = router;
