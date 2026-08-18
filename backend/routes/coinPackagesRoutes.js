const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { listActiveCoinPackages } = require('../controllers/coinPackagesController');

// Any authenticated user can see the active coin package catalog (Navbar coin balance ->
// CoinPackagesModal) - creating/editing/deleting is admin-only, under adminRoutes.js.
router.get('/', protect, listActiveCoinPackages);

module.exports = router;
