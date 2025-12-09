/**
 * Birthdays Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const birthdaysController = require('../controllers/birthdaysController');

router.use(requireAuth);

// Get upcoming birthdays
router.get('/', birthdaysController.getUpcomingBirthdays);

// Get today's birthdays
router.get('/today', birthdaysController.getTodaysBirthdays);

module.exports = router;
