const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { listUserReports, createAndGenerateReport, getReport, getReportStatus, regenerateReport, exportReport, deleteReport, downloadReportFile } = require('../controllers/reportsController');

router.use(protect);

router.get('/', listUserReports);
router.post('/', createAndGenerateReport);
router.get('/:id', getReport);
router.get('/:id/status', getReportStatus);
router.put('/:id/regenerate', regenerateReport);
router.get('/:id/export', exportReport);
router.get('/:id/download/:type', downloadReportFile);
router.delete('/:id', deleteReport);

module.exports = router;
