const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { submitForm, listSubmissions, getSubmissionDetail } = require('../controllers/submissionsController');

router.use(protect);

router.post('/', submitForm);
router.get('/', checkPermission('submissions.view_all'), listSubmissions);
router.get('/:id', checkPermission('submissions.view_all'), getSubmissionDetail);

module.exports = router;
