const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    listProjects, createProject, getProject, updateProject, deleteProject,
    shareProject, unshareProject, unlockProject, getSharedProjectsForMe, listSharedProjectsLibrary
} = require('../controllers/projectsController');

router.use(protect);

router.get('/', listProjects);
router.post('/', createProject);

// Shared-projects listings - must come before the /:id catch-all below
router.get('/shared', getSharedProjectsForMe);
router.get('/library', listSharedProjectsLibrary);

router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/share', shareProject);
router.post('/:id/unshare', unshareProject);
router.post('/:id/unlock', unlockProject);

module.exports = router;
