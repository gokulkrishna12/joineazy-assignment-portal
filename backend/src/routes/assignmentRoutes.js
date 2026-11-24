const express = require('express');
const {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignments,
} = require('../controllers/assignmentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/', getAssignments);
router.post('/', authorize('ADMIN'), createAssignment);
router.put('/:id', authorize('ADMIN'), updateAssignment);
router.delete('/:id', authorize('ADMIN'), deleteAssignment);

module.exports = router;