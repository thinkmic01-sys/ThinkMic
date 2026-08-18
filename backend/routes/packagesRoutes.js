const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { listActivePackages } = require('../controllers/packagesController');

// Any authenticated user can see the active package catalog (purchase-prompt dialog) -
// creating/editing/deleting packages is admin-only and lives under adminRoutes.js.
router.get('/', protect, listActivePackages);

module.exports = router;
