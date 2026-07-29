const express = require('express');
const router = express.Router();
const { protect, checkRole } = require('../middleware/authMiddleware');
const { listSchemas, getSchema, createSchema, updateSchema, publishSchema, listPublishedForms } = require('../controllers/schemasController');

router.use(protect);

// User route for forms
router.get('/forms', listPublishedForms);

// Admin routes for schema building
router.get('/', checkRole('admin'), listSchemas);
router.get('/:id', checkRole('admin'), getSchema);
router.post('/', checkRole('admin'), createSchema);
router.put('/:id', checkRole('admin'), updateSchema);
router.post('/:id/publish', checkRole('admin'), publishSchema);

module.exports = router;
