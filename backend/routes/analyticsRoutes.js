const express = require('express');
const router = express.Router();
const { protect, checkRole } = require('../middleware/authMiddleware');
const { getUsageKPIs, getSubmissionAnalytics } = require('../controllers/analyticsController');

router.use(protect);

router.get('/usage', getUsageKPIs);
router.get('/submissions', checkRole('manager', 'admin'), getSubmissionAnalytics);

module.exports = router;
