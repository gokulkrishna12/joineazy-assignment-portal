const express = require('express');
const router = express.Router();
const { getCourses, getCourseById } = require('../controllers/courseController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, getCourses);
router.get('/:id', authenticate, getCourseById);

module.exports = router;