const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { exportSubmissionsCsv } = require('../controllers/exportsController');

router.use(protect);
router.use(checkPermission('exports.access'));

router.get('/submissions/:schemaId', exportSubmissionsCsv);

module.exports = router;
