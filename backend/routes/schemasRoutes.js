const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { listSchemas, getSchema, createSchema, updateSchema, publishSchema, listPublishedForms } = require('../controllers/schemasController');

router.use(protect);

// User route for forms
router.get('/forms', listPublishedForms);

// Admin routes for schema building
router.get('/', checkPermission('schemas.manage'), listSchemas);
router.get('/:id', checkPermission('schemas.manage'), getSchema);
router.post('/', checkPermission('schemas.manage'), createSchema);
router.put('/:id', checkPermission('schemas.manage'), updateSchema);
router.post('/:id/publish', checkPermission('schemas.manage'), publishSchema);

module.exports = router;
