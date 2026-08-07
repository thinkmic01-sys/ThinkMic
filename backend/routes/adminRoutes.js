const express = require('express');
const router = express.Router();
const { protect, checkRole } = require('../middleware/authMiddleware');
const { listUsers, getDistinctTitles, inviteUsers, updateUserRoleStatus, deleteUser } = require('../controllers/adminController');
const {
    getSettings, updateSettings, listPendingRewards, updatePendingReward,
    approveReward, rejectReward, getApprovalHistory, getStats, adjustUserCoins
} = require('../controllers/rewardsAdminController');

router.use(protect);
router.use(checkRole('admin'));

router.get('/users', listUsers);
router.get('/users/titles', getDistinctTitles);
router.post('/users/invite', inviteUsers);
router.patch('/users/:id', updateUserRoleStatus);
router.delete('/users/:id', deleteUser);

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
