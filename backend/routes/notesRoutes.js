const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notesController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(notesController.getNotes)
    .post(notesController.createNote);

router.route('/:id')
    .put(notesController.updateNote)
    .delete(notesController.deleteNote);

module.exports = router;
