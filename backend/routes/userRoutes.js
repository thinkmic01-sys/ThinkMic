const express = require('express');
const router = express.Router();
const { getMe, updateMe, getDocumentUploadUrl, getMyStudents, updateMyStudents, searchStudents, getMyUsage, purchaseUsageTopUp } = require('../controllers/userController');
const { getRates } = require('../controllers/usageRatesController');
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { expensiveOperationLimiter } = require('../middleware/rateLimiters');

// The 'protect' middleware ensures only users with a valid token can hit these
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.get('/me/documents/upload-url', protect, expensiveOperationLimiter, getDocumentUploadUrl);
router.get('/me/usage', protect, getMyUsage);
router.post('/me/usage/topup', protect, purchaseUsageTopUp);
router.get('/usage-rates', protect, getRates);

// Self-service roster for a Lecturer-style role (schemas.manage_own) - lets them add/remove
// their own students without needing the admin-only users.view/manage_role_status
// permissions the equivalent /admin/users/:id/students endpoints require.
router.get('/search-students', protect, checkPermission('schemas.manage_own', 'schemas.manage'), searchStudents);
router.get('/me/students', protect, checkPermission('schemas.manage_own', 'schemas.manage'), getMyStudents);
router.patch('/me/students', protect, checkPermission('schemas.manage_own', 'schemas.manage'), updateMyStudents);

module.exports = router;