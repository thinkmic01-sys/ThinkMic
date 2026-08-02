const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { listProjects, createProject, getProject, updateProject, deleteProject } = require('../controllers/projectsController');

router.use(protect);

router.get('/', listProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
