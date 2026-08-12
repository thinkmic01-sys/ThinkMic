const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { listSchemas, getSchema, createSchema, updateSchema, publishSchema, listPublishedForms } = require('../controllers/schemasController');

router.use(protect);

// User route for forms
router.get('/forms', listPublishedForms);

// Admin routes for schema building - schemas.manage_own (e.g. a Lecturer) can reach the
// same routes but every controller above scopes them to schemas that caller created.
router.get('/', checkPermission('schemas.manage', 'schemas.manage_own'), listSchemas);
router.get('/:id', checkPermission('schemas.manage', 'schemas.manage_own'), getSchema);
router.post('/', checkPermission('schemas.manage', 'schemas.manage_own'), createSchema);
router.put('/:id', checkPermission('schemas.manage', 'schemas.manage_own'), updateSchema);
router.post('/:id/publish', checkPermission('schemas.manage', 'schemas.manage_own'), publishSchema);

module.exports = router;
