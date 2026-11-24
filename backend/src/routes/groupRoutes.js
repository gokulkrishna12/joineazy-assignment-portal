const express = require('express');
const {
  createGroup,
  getMyGroups,
  getAllGroups,
  addMember,
  removeMember,
} = require('../controllers/groupController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('STUDENT'), createGroup);
router.get('/my', authorize('STUDENT'), getMyGroups);
router.get('/', authorize('ADMIN'), getAllGroups);
router.post('/:groupId/members', authorize('STUDENT'), addMember);
router.delete('/:groupId/members/:userId', authorize('STUDENT'), removeMember);

module.exports = router;