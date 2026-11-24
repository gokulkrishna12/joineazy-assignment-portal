const express = require('express');
const {
  sendRegisterOtp,
  register,
  login,
  forgotPassword,
  resetPassword,
  googleAuth,
  getMe,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/send-register-otp', sendRegisterOtp);
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/google', googleAuth);
router.get('/me', authenticate, getMe);

module.exports = router;