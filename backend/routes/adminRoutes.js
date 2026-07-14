const express = require('express');
const router = express.Router();
const { protect, checkRole } = require('../middleware/authMiddleware');
const { listUsers, inviteUsers, updateUserRoleStatus, deleteUser } = require('../controllers/adminController');

router.use(protect);
router.use(checkRole('admin'));

router.get('/users', listUsers);
router.post('/users/invite', inviteUsers);
router.patch('/users/:id', updateUserRoleStatus);
router.delete('/users/:id', deleteUser);

module.exports = router;
