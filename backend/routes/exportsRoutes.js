const express = require('express');
const router = express.Router();
const { protect, checkRole } = require('../middleware/authMiddleware');
const { createExportJob, pollExportStatus } = require('../controllers/exportsController');

router.use(protect);
router.use(checkRole('manager', 'admin'));

router.post('/', createExportJob);
router.get('/:jobId', pollExportStatus);

module.exports = router;
