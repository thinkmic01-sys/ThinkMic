const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { getUsageKPIs, getSubmissionAnalytics } = require('../controllers/analyticsController');

router.use(protect);

router.get('/usage', getUsageKPIs);
router.get('/submissions', checkPermission('analytics.view'), getSubmissionAnalytics);

module.exports = router;
