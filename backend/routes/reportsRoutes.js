const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { listUserReports, createAndGenerateReport, getReport, getReportStatus } = require('../controllers/reportsController');

router.use(protect);

router.get('/', listUserReports);
router.post('/', createAndGenerateReport);
router.get('/:id', getReport);
router.get('/:id/status', getReportStatus);

module.exports = router;
