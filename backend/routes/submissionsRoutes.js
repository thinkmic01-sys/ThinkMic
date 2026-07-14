const express = require('express');
const router = express.Router();
const { protect, checkRole } = require('../middleware/authMiddleware');
const { submitForm, listSubmissions, getSubmissionDetail } = require('../controllers/submissionsController');

router.use(protect);

router.post('/', submitForm);
router.get('/', checkRole('manager', 'admin'), listSubmissions);
router.get('/:id', checkRole('manager', 'admin'), getSubmissionDetail);

module.exports = router;
