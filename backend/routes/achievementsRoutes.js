const express = require('express');
const router = express.Router();
const achievementsController = require('../controllers/achievementsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// GET only - no client-writable transaction endpoint exists here on purpose. Every real
// coin mutation must go through coinWalletService.js (the app's single choke point for
// balance changes); a prior POST /transactions let any authenticated user credit themselves
// an arbitrary amount directly, bypassing that entirely.
router.get('/transactions', achievementsController.getTransactions);

router.get('/leaderboard', achievementsController.getLeaderboard);
router.get('/timeline', achievementsController.getTimelineEvents);
router.get('/stats', achievementsController.getStats);

module.exports = router;
