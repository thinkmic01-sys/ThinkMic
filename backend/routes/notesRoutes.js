const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notesController');
const { protect } = require('../middleware/authMiddleware');
const { expensiveOperationLimiter } = require('../middleware/rateLimiters');

router.use(protect);

router.route('/')
    .get(notesController.getNotes)
    .post(notesController.createNote);

router.route('/:id')
    .put(notesController.updateNote)
    .delete(notesController.deleteNote);

router.route('/:id/insights')
    .post(expensiveOperationLimiter, notesController.generateInsights);

router.route('/:id/export')
    .get(notesController.exportNote);

module.exports = router;
