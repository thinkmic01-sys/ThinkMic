const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createSearchSession, getSearchSessionResults, updateSelectedResults, getUserSearchSessions } = require('../controllers/searchController');

router.use(protect);

router.get('/sessions', getUserSearchSessions);
router.post('/sessions', createSearchSession);
router.get('/sessions/:id', getSearchSessionResults);
router.patch('/sessions/:id/selections', updateSelectedResults);

module.exports = router;
