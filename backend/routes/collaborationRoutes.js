const express = require('express');
const router = express.Router();
const collaborationController = require('../controllers/collaborationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/referrals')
    .get(collaborationController.getReferralDashboard);

router.route('/submissions')
    .get(collaborationController.getSubmissions)
    .post(collaborationController.createSubmission);

router.route('/submissions/:id')
    .put(collaborationController.updateSubmission);

module.exports = router;
