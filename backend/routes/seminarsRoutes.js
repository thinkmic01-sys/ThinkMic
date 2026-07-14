const express = require('express');
const router = express.Router();
const {
    getSeminars,
    createSeminar,
    updateSeminar,
    deleteSeminar,
    registerForSeminar,
    getRegistrations
} = require('../controllers/seminarsController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getSeminars)
    .post(protect, createSeminar);

router.route('/registrations')
    .get(protect, getRegistrations);

router.route('/:id')
    .put(protect, updateSeminar)
    .delete(protect, deleteSeminar);

router.route('/:id/register')
    .post(protect, registerForSeminar);

module.exports = router;
