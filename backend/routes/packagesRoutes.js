const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { listActivePackages, selectPackage } = require('../controllers/packagesController');

// Any authenticated user can see the active package catalog (purchase-prompt dialog) -
// creating/editing/deleting packages is admin-only and lives under adminRoutes.js.
router.get('/', protect, listActivePackages);

// Selecting a package is currently free (no payment gateway wired up yet) - any
// authenticated user can select/upgrade their own package.
router.post('/:id/select', protect, selectPackage);

module.exports = router;
