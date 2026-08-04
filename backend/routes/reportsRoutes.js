const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { expensiveOperationLimiter } = require('../middleware/rateLimiters');
const { listUserReports, createAndGenerateReport, getReport, getReportStatus, regenerateReport, exportReport, deleteReport, downloadReportFile, sendReportEmail } = require('../controllers/reportsController');

router.use(protect);

router.get('/', listUserReports);
router.post('/', expensiveOperationLimiter, createAndGenerateReport);
router.get('/:id', getReport);
router.get('/:id/status', getReportStatus);
router.put('/:id/regenerate', expensiveOperationLimiter, regenerateReport);
router.get('/:id/export', expensiveOperationLimiter, exportReport);
router.get('/:id/download/:type', downloadReportFile);
router.post('/:id/email', expensiveOperationLimiter, sendReportEmail);
router.delete('/:id', deleteReport);

module.exports = router;
