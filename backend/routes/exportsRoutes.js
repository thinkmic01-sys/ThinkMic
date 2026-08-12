const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { createExportJob, pollExportStatus } = require('../controllers/exportsController');

router.use(protect);
router.use(checkPermission('exports.access'));

router.post('/', createExportJob);
router.get('/:jobId', pollExportStatus);

module.exports = router;
