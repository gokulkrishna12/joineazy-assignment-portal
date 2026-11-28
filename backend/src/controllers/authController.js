const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/db');
const { sendOtpEmail } = require('../config/mailer');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (user) =>
  jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const isValidProfessorId = (professorId) => {
  if (!professorId || typeof professorId !== 'string') return false;
  const validCodes = (process.env.PROFESSOR_ACCESS_CODES || 'PROF2026,FAC101,FAC102')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  return validCodes.includes(professorId.trim().toUpperCase());
};

// 1. POST /api/auth/send-register-otp
const sendRegisterOtp = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Valid email is required.' });
    }

    const existing = await db.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const otpCode = generateOtp();

    await db.query(
      `UPDATE email_otps SET used = TRUE WHERE LOWER(email) = LOWER($1) AND purpose = 'REGISTER' AND used = FALSE`,
      [email]
    );

    await db.query(
      `INSERT INTO email_otps (email, otp_code, purpose, expires_at)
       VALUES ($1, $2, 'REGISTER', NOW() + INTERVAL '10 minutes')`,
      [email, otpCode]
    );

    await sendOtpEmail(email, otpCode, 'REGISTER');

    res.json({ message: 'Verification OTP sent to your email. Check your inbox or spam folder.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send verification OTP.', error: err.message });
  }
};

// 2. POST /api/auth/register (Verifies Faculty ID for Professors + OTP, then creates account)
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'STUDENT',
      student_id,
      professor_id,
      otp,
    } = req.body;

    if (!name || !email || !password || !otp) {
      return res.status(400).json({ message: 'Name, email, password, and 6-digit OTP are required.' });
    }

    const normalizedRole = role.toUpperCase();
    if (!['STUDENT', 'ADMIN'].includes(normalizedRole)) {
      return res.status(400).json({ message: 'Role must be STUDENT or ADMIN.' });
    }

    // Strict Faculty / Professor Access ID verification
    if (normalizedRole === 'ADMIN' && !isValidProfessorId(professor_id)) {
      return res.status(403).json({
        message:
          'Invalid Professor Access ID. A valid Faculty ID (e.g. PROF2026) is required to register as Professor.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify OTP
    const otpRes = await db.query(
      `SELECT id FROM email_otps
       WHERE LOWER(email) = LOWER($1)
         AND otp_code = $2
         AND purpose = 'REGISTER'
         AND used = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedEmail, String(otp).trim()]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new code.' });
    }

    const cleanStudentId =
      normalizedRole === 'STUDENT' && student_id && student_id.trim() !== ''
        ? student_id.trim().toUpperCase()
        : null;

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (name, email, student_id, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, name, email, student_id, role, created_at`,
      [name.trim(), normalizedEmail, cleanStudentId, passwordHash, normalizedRole]
    );

    await db.query(`UPDATE email_otps SET used = TRUE WHERE id = $1`, [otpRes.rows[0].id]);

    const user = result.rows[0];
    const token = signToken(user);

    res.status(201).json({ message: 'Email verified and account created!', token, user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Email or Student ID is already registered.' });
    }
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

// 3. POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const result = await db.query(
      `SELECT id, name, email, student_id, password_hash, role
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const { password_hash, ...safeUser } = user;
    const token = signToken(safeUser);

    res.json({ message: 'Login successful', token, user: safeUser });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

// 4. POST /api/auth/forgot-password (Sends Reset OTP)
const forgotPassword = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const userRes = await db.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'No account found with this email.' });
    }

    const otpCode = generateOtp();

    await db.query(
      `UPDATE email_otps SET used = TRUE WHERE LOWER(email) = LOWER($1) AND purpose = 'RESET' AND used = FALSE`,
      [email]
    );

    await db.query(
      `INSERT INTO email_otps (email, otp_code, purpose, expires_at)
       VALUES ($1, $2, 'RESET', NOW() + INTERVAL '10 minutes')`,
      [email, otpCode]
    );

    await sendOtpEmail(email, otpCode, 'RESET');

    res.json({ message: 'Password reset OTP sent to your email.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send reset OTP.', error: err.message });
  }
};

// 5. POST /api/auth/reset-password (Verifies OTP & updates password)
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const otpRes = await db.query(
      `SELECT id FROM email_otps
       WHERE LOWER(email) = LOWER($1)
         AND otp_code = $2
         AND purpose = 'RESET'
         AND used = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedEmail, String(otp).trim()]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE users SET password_hash = $1 WHERE LOWER(email) = LOWER($2)`,
      [passwordHash, normalizedEmail]
    );

    await db.query(`UPDATE email_otps SET used = TRUE WHERE id = $1`, [otpRes.rows[0].id]);

    res.json({ message: 'Password reset successful! You can now sign in.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reset password.', error: err.message });
  }
};

// 6. POST /api/auth/google (Google OAuth Sign-In / Sign-Up)
const googleAuth = async (req, res) => {
  try {
    const { credential, role = 'STUDENT', professor_id } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is required.' });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: 'Google OAuth is not configured on the server.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase();
    const name = payload.name || email.split('@')[0];
    const googleId = payload.sub;

    let userRes = await db.query(
      `SELECT id, name, email, student_id, role, google_id FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    let user = userRes.rows[0];

    if (!user) {
      const normalizedRole = ['STUDENT', 'ADMIN'].includes(role.toUpperCase())
        ? role.toUpperCase()
        : 'STUDENT';

      // Prevent unauthorized Professor sign-ups via Google OAuth
      if (normalizedRole === 'ADMIN' && !isValidProfessorId(professor_id)) {
        return res.status(403).json({
          message:
            'New Professor accounts require a valid Faculty Access ID. Please register via email with your Professor ID.',
        });
      }

      const autoStudentId =
        normalizedRole === 'STUDENT' ? `STU${crypto.randomInt(1000, 9999)}` : null;
      const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

      const insertRes = await db.query(
        `INSERT INTO users (name, email, student_id, password_hash, role, is_verified, google_id)
         VALUES ($1, $2, $3, $4, $5, TRUE, $6)
         RETURNING id, name, email, student_id, role`,
        [name, email, autoStudentId, randomPasswordHash, normalizedRole, googleId]
      );
      user = insertRes.rows[0];
    } else if (!user.google_id) {
      await db.query(`UPDATE users SET google_id = $1, is_verified = TRUE WHERE id = $2`, [
        googleId,
        user.id,
      ]);
    }

    const token = signToken(user);
    res.json({ message: 'Google authentication successful', token, user });
  } catch (err) {
    res.status(401).json({ message: 'Google authentication failed.', error: err.message });
  }
};

// 7. GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, student_id, role, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
  }
};

module.exports = {
  sendRegisterOtp,
  register,
  login,
  forgotPassword,
  resetPassword,
  googleAuth,
  getMe,
};