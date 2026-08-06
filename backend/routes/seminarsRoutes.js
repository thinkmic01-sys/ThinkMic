const express = require('express');
const router = express.Router();
const {
    getSeminars,
    getSeminarById,
    createSeminar,
    updateSeminar,
    deleteSeminar,
    registerForSeminar,
    getRegistrations,
    startSeminar,
    endSeminar
} = require('../controllers/seminarsController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getSeminars)
    .post(protect, createSeminar);

router.route('/registrations')
    .get(protect, getRegistrations);

router.route('/:id')
    .get(protect, getSeminarById)
    .put(protect, updateSeminar)
    .delete(protect, deleteSeminar);

router.route('/:id/register')
    .post(protect, registerForSeminar);

router.route('/:id/start')
    .post(protect, startSeminar);

router.route('/:id/end')
    .post(protect, endSeminar);

module.exports = router;
