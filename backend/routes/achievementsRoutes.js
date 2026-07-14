const express = require('express');
const router = express.Router();
const achievementsController = require('../controllers/achievementsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/transactions')
    .get(achievementsController.getTransactions)
    .post(achievementsController.addTransaction);

router.get('/leaderboard', achievementsController.getLeaderboard);
router.get('/timeline', achievementsController.getTimelineEvents);
router.get('/stats', achievementsController.getStats);

module.exports = router;
