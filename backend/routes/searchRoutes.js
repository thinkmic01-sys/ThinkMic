const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { expensiveOperationLimiter } = require('../middleware/rateLimiters');
const { createSearchSession, getSearchSessionResults, updateSelectedResults, getUserSearchSessions } = require('../controllers/searchController');

router.use(protect);

router.get('/sessions', getUserSearchSessions);
// No usageGuard pre-check here (unlike recordings) - createSearchSession's own
// usageService.reserveUsage() call is the single, atomic, authoritative check; there's no
// expensive upload to save bandwidth on by rejecting early, so a separate advisory
// pre-check would just be a redundant extra query.
router.post('/sessions', expensiveOperationLimiter, createSearchSession);
router.get('/sessions/:id', getSearchSessionResults);
router.patch('/sessions/:id/selections', updateSelectedResults);

module.exports = router;
