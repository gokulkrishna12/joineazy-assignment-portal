const express = require('express');
const { confirmSubmission, getAnalytics } = require('../controllers/submissionController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.post('/confirm', authorize('STUDENT'), confirmSubmission);
router.get('/analytics', authorize('ADMIN'), getAnalytics);

module.exports = router;