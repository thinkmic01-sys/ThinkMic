const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { listKeywords } = require('../controllers/keywordsController');

// Any authenticated user can browse the keyword list (My Learning List, seminar category
// dropdown) - creating/deleting keywords is admin-only and lives under adminRoutes.js.
router.get('/', protect, listKeywords);

module.exports = router;
