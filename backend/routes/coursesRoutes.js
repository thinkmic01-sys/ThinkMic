const express = require('express');
const router = express.Router();
const coursesController = require('../controllers/coursesController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(coursesController.getCourses);

router.route('/:id')
    .get(coursesController.getCourseById);

module.exports = router;
