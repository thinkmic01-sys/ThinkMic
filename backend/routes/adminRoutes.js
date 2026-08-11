const express = require('express');
const router = express.Router();
const { protect, checkRole } = require('../middleware/authMiddleware');
const { listUsers, getDistinctTitles, inviteUsers, updateUserRoleStatus, deleteUser } = require('../controllers/adminController');
const {
    getSettings, updateSettings, listPendingRewards, updatePendingReward,
    approveReward, rejectReward, getApprovalHistory, getStats, adjustUserCoins
} = require('../controllers/rewardsAdminController');
const {
    getUserProfile, getUserResearch, getUserReports, getUserNotes, getUserSeminars,
    getUserCollaboration, getUserCoins, getUserTimeline, getUserTickets
} = require('../controllers/adminUserDetailController');

router.use(protect);
router.use(checkRole('admin'));

router.get('/users', listUsers);
router.get('/users/titles', getDistinctTitles);
router.post('/users/invite', inviteUsers);
router.patch('/users/:id', updateUserRoleStatus);
router.delete('/users/:id', deleteUser);

// Full-access admin view of a single user - each tab on the frontend page lazy-loads
// its own section rather than one giant join across every collection.
router.get('/users/:id/profile', getUserProfile);
router.get('/users/:id/research', getUserResearch);
router.get('/users/:id/reports', getUserReports);
router.get('/users/:id/notes', getUserNotes);
router.get('/users/:id/seminars', getUserSeminars);
router.get('/users/:id/collaboration', getUserCollaboration);
router.get('/users/:id/coins', getUserCoins);
router.get('/users/:id/timeline', getUserTimeline);
router.get('/users/:id/tickets', getUserTickets);

router.get('/rewards/settings', getSettings);
router.patch('/rewards/settings', updateSettings);
router.get('/rewards/pending', listPendingRewards);
router.patch('/rewards/pending/:id', updatePendingReward);
router.post('/rewards/pending/:id/approve', approveReward);
router.post('/rewards/pending/:id/reject', rejectReward);
router.get('/rewards/history', getApprovalHistory);
router.get('/rewards/stats', getStats);
router.post('/rewards/adjust/:userId', adjustUserCoins);

module.exports = router;
