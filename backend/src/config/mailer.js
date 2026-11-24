const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const sendOtpEmail = async (toEmail, otpCode, purpose) => {
  const isRegister = purpose === 'REGISTER';
  const subject = isRegister
    ? 'Joineazy Portal — Verify Your Email (OTP)'
    : 'Joineazy Portal — Password Reset OTP';

  const heading = isRegister ? 'Email Verification Code' : 'Reset Your Password';
  const subtitle = isRegister
    ? 'Use this 6-digit OTP to complete your Joineazy account registration.'
    : 'Use this 6-digit OTP to verify your identity and set a new password.';

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log(`[DEV OTP - ${purpose}] ${toEmail} -> ${otpCode}`);
    return;
  }

  await transporter.sendMail({
    from: `"Joineazy Portal" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 14px;">
        <h2 style="color: #4f46e5; margin-top: 0;">${heading}</h2>
        <p style="color: #475569; font-size: 14px;">${subtitle}</p>
        <div style="background: #f1f5f9; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0;">
          <span style="font-size: 30px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${otpCode}</span>
        </div>
        <p style="color: #64748b; font-size: 12px;">This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail };