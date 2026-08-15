const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { listUsers, getDistinctTitles, inviteUsers, updateUserRoleStatus, deleteUser, getLecturerStudents, updateLecturerStudents } = require('../controllers/adminController');
const {
    getSettings, updateSettings, listPendingRewards, updatePendingReward,
    approveReward, rejectReward, getApprovalHistory, getStats, adjustUserCoins,
    getRankTiers, updateRankTiers
} = require('../controllers/rewardsAdminController');
const {
    getUserProfile, getUserResearch, getUserReports, getUserNotes, getUserSeminars,
    getUserCollaboration, getUserCoins, getUserTimeline, getUserTickets
} = require('../controllers/adminUserDetailController');
const {
    getPermissionCatalog, listRoles, createRole, updateRole, deleteRole
} = require('../controllers/roleController');
const { createKeyword, deleteKeyword } = require('../controllers/keywordsController');
const {
    getSettings: getPromptSettings, updateSettings: updatePromptSettings
} = require('../controllers/promptSettingsAdminController');

router.use(protect);
// Every route below carries its own checkPermission() - there is deliberately no
// router-level gate here (unlike the old single checkRole('admin')), since custom roles
// need to be able to reach exactly the subset of these routes their permissions grant.

router.get('/users', checkPermission('users.view'), listUsers);
router.get('/users/titles', checkPermission('users.view'), getDistinctTitles);
router.post('/users/invite', checkPermission('users.invite'), inviteUsers);
router.patch('/users/:id', checkPermission('users.manage_role_status'), updateUserRoleStatus);
router.delete('/users/:id', checkPermission('users.delete'), deleteUser);

// Lecturer roster (:id is the lecturer, not the student) - who a Lecturer-role user's
// schemas.manage_own forms are visible to. Gated the same as role/status management since
// assigning a roster is itself a role-adjacent action on the affected student accounts.
router.get('/users/:id/students', checkPermission('users.view_full_profile'), getLecturerStudents);
router.patch('/users/:id/students', checkPermission('users.manage_role_status'), updateLecturerStudents);

// Full-access admin view of a single user - each tab on the frontend page lazy-loads
// its own section rather than one giant join across every collection.
router.get('/users/:id/profile', checkPermission('users.view_full_profile'), getUserProfile);
router.get('/users/:id/research', checkPermission('users.view_full_profile'), getUserResearch);
router.get('/users/:id/reports', checkPermission('users.view_full_profile'), getUserReports);
router.get('/users/:id/notes', checkPermission('users.view_full_profile'), getUserNotes);
router.get('/users/:id/seminars', checkPermission('users.view_full_profile'), getUserSeminars);
router.get('/users/:id/collaboration', checkPermission('users.view_full_profile'), getUserCollaboration);
router.get('/users/:id/coins', checkPermission('users.view_full_profile'), getUserCoins);
router.get('/users/:id/timeline', checkPermission('users.view_full_profile'), getUserTimeline);
router.get('/users/:id/tickets', checkPermission('users.view_full_profile'), getUserTickets);

router.get('/rewards/settings', checkPermission('rewards.manage_settings'), getSettings);
router.patch('/rewards/settings', checkPermission('rewards.manage_settings'), updateSettings);
router.get('/rewards/pending', checkPermission('rewards.manage_pending'), listPendingRewards);
router.patch('/rewards/pending/:id', checkPermission('rewards.manage_pending'), updatePendingReward);
router.post('/rewards/pending/:id/approve', checkPermission('rewards.approve_reject'), approveReward);
router.post('/rewards/pending/:id/reject', checkPermission('rewards.approve_reject'), rejectReward);
router.get('/rewards/history', checkPermission('rewards.view_history_stats'), getApprovalHistory);
router.get('/rewards/stats', checkPermission('rewards.view_history_stats'), getStats);
router.post('/rewards/adjust/:userId', checkPermission('rewards.adjust_coins'), adjustUserCoins);
router.get('/rewards/rank-tiers', checkPermission('rewards.manage_rank_tiers'), getRankTiers);
router.put('/rewards/rank-tiers', checkPermission('rewards.manage_rank_tiers'), updateRankTiers);

// Roles & Permissions - creating/editing/deleting custom roles, and the catalog that
// backs the permission checklist UI. getPermissionCatalog is deliberately gated the same
// as the rest (roles.manage) rather than left open, since it reveals every capability
// the app has.
router.get('/roles/catalog', checkPermission('roles.manage'), getPermissionCatalog);
router.get('/roles', checkPermission('roles.manage'), listRoles);
router.post('/roles', checkPermission('roles.manage'), createRole);
router.patch('/roles/:id', checkPermission('roles.manage'), updateRole);
router.delete('/roles/:id', checkPermission('roles.manage'), deleteRole);

// Keywords - admin curation only; reading the list (My Learning List, seminar category
// dropdown) is open to any authenticated user via GET /api/v1/keywords instead.
router.post('/keywords', checkPermission('keywords.manage'), createKeyword);
router.delete('/keywords/:id', checkPermission('keywords.manage'), deleteKeyword);

// AI Prompts - the admin-editable persona/mission sentence for each AI generation step
// (see backend/services/openaiService.js and models/PromptSettings.js).
router.get('/prompts/settings', checkPermission('prompts.manage'), getPromptSettings);
router.patch('/prompts/settings', checkPermission('prompts.manage'), updatePromptSettings);

module.exports = router;
