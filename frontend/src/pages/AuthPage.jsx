import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import {
  BookOpenCheck,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Mail,
  KeyRound,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;

const getPasswordChecks = (pwd) => [
  { label: 'At least 8 characters', passed: pwd.length >= 8 },
  { label: 'Uppercase & lowercase letter', passed: /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) },
  { label: 'At least 1 number (0-9)', passed: /\d/.test(pwd) },
  { label: 'At least 1 special symbol (@$!%*?&#)', passed: /[@$!%*?&#^()_\-+=]/.test(pwd) },
];

function PasswordChecklist({ value }) {
  if (!value) return null;
  const checks = getPasswordChecks(value);

  return (
    <div className="password-rules-box mt-2 space-y-1">
      {checks.map((item) => (
        <div
          key={item.label}
          className={`flex items-center gap-1.5 text-[11px] font-medium ${
            item.passed ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          {item.passed ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          ) : (
            <X className="h-3.5 w-3.5 shrink-0 text-rose-400" />
          )}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const {
    user,
    logout,
    login,
    sendRegisterOtp,
    register,
    googleLogin,
    forgotPassword,
    resetPassword,
  } = useAuth();

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    student_id: '',
    professor_id: '',
    otp: '',
    newPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);

  useEffect(() => {
    if (pendingRedirect && user) {
      setPendingRedirect(false);
      const role = (user.role || '').toUpperCase();
      navigate(role === 'ADMIN' ? '/admin' : '/student');
    }
  }, [pendingRedirect, user, navigate]);

  const goDashboard = (u) => {
    const role = (u?.role || '').toUpperCase();
    navigate(role === 'ADMIN' ? '/admin' : '/student');
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setOtpSent(false);
    setShowPassword(false);
    setShowNewPassword(false);
    setError('');
    setSuccess('');
    setForm((prev) => ({ ...prev, otp: '', newPassword: '' }));
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      setPendingRedirect(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.role === 'ADMIN' && !form.professor_id.trim()) {
      setError('A valid Professor / Faculty Access ID (e.g. PROF2026) is required.');
      return;
    }

    if (!PASSWORD_REGEX.test(form.password)) {
      setError(
        'Password must be 8+ chars with uppercase, lowercase, number, and special character.'
      );
      return;
    }

    setSubmitting(true);
    try {
      if (!otpSent) {
        const res = await sendRegisterOtp(form.email);
        setOtpSent(true);
        setSuccess(res.message || '6-digit OTP sent to your Gmail.');
      } else {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          student_id: form.role === 'STUDENT' ? form.student_id.trim() : undefined,
          professor_id: form.role === 'ADMIN' ? form.professor_id.trim().toUpperCase() : undefined,
          otp: form.otp.trim(),
        });
        setPendingRedirect(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration step failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (otpSent && !PASSWORD_REGEX.test(form.newPassword)) {
      setError(
        'New password must be 8+ chars with uppercase, lowercase, number, and special character.'
      );
      return;
    }

    setSubmitting(true);
    try {
      if (!otpSent) {
        const res = await forgotPassword(form.email);
        setOtpSent(true);
        setSuccess(res.message || 'Password reset OTP sent to your Gmail.');
      } else {
        const res = await resetPassword({
          email: form.email,
          otp: form.otp.trim(),
          newPassword: form.newPassword,
        });
        setMode('login');
        setOtpSent(false);
        setShowNewPassword(false);
        setForm((prev) => ({ ...prev, password: '', otp: '', newPassword: '' }));
        setSuccess(res.message || 'Password updated! Please sign in.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const res =
        mode === 'register'
          ? await sendRegisterOtp(form.email)
          : await forgotPassword(form.email);
      setSuccess(res.message || 'New OTP sent to your Gmail.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await googleLogin(credentialResponse.credential, form.role);
      setPendingRedirect(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Google Sign-In failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const quickDemoLogin = async (email) => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await login(email, 'password123');
      setPendingRedirect(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Demo login failed. Run backend seed first.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-mesh-bg flex min-h-screen items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
            <BookOpenCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Joineazy Portal</h1>
          <p className="mt-1 text-sm text-slate-500">
            Student, Group & Assignment Management System
          </p>
        </div>

        {user && !pendingRedirect && (
          <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50/80 p-3.5 text-center">
            <p className="text-xs font-medium text-slate-600">
              Signed in as <strong className="text-slate-900">{user.name}</strong> (
              {(user.role || '').toUpperCase() === 'ADMIN' ? 'Professor' : 'Student'})
            </p>
            <div className="mt-2.5 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => goDashboard(user)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        )}

        {mode !== 'forgot' ? (
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded-lg py-2 text-sm font-semibold transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`rounded-lg py-2 text-sm font-semibold transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
            </button>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              <KeyRound className="h-3.5 w-3.5" /> Password Recovery
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email Address</label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="name@joineazy.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="password-eye-btn absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="loading-spinner" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={otpSent}
                  onClick={() => setForm((p) => ({ ...p, role: 'STUDENT' }))}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-sm font-medium transition cursor-pointer disabled:opacity-70 ${
                    form.role === 'STUDENT'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  Student
                </button>
                <button
                  type="button"
                  disabled={otpSent}
                  onClick={() => setForm((p) => ({ ...p, role: 'ADMIN' }))}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-sm font-medium transition cursor-pointer disabled:opacity-70 ${
                    form.role === 'ADMIN'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Professor
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
              <input
                type="text"
                name="name"
                required
                disabled={otpSent}
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Gokul Krishna"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50"
              />
            </div>

            {form.role === 'STUDENT' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Student ID</label>
                <input
                  type="text"
                  name="student_id"
                  required
                  disabled={otpSent}
                  value={form.student_id}
                  onChange={handleChange}
                  placeholder="e.g. STU105"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm uppercase outline-none focus:border-indigo-500 disabled:bg-slate-50"
                />
              </div>
            )}

            {form.role === 'ADMIN' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Professor / Faculty Access ID *
                </label>
                <input
                  type="text"
                  name="professor_id"
                  required
                  disabled={otpSent}
                  value={form.professor_id}
                  onChange={handleChange}
                  placeholder="Enter Faculty ID (e.g. PROF2026)"
                  className="w-full rounded-xl border border-indigo-300 bg-white px-3.5 py-2 text-sm uppercase outline-none focus:border-indigo-500 disabled:bg-slate-50"
                />
                <p className="mt-1 text-[11px] font-medium text-indigo-600">
                  Verified institutional Faculty ID required for Professor registration.
                </p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email Address (OTP will be sent here)
              </label>
              <input
                type="email"
                name="email"
                required
                disabled={otpSent}
                value={form.email}
                onChange={handleChange}
                placeholder="you@gmail.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Strong Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  disabled={otpSent}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="e.g. Joineazy@2026"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-3.5 pr-10 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="password-eye-btn absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!otpSent && <PasswordChecklist value={form.password} />}
            </div>

            {otpSent && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-800">
                  <Mail className="h-3.5 w-3.5" /> Enter 6-Digit Gmail OTP
                </label>
                <input
                  type="text"
                  name="otp"
                  required
                  maxLength={6}
                  value={form.otp}
                  onChange={handleChange}
                  placeholder="123456"
                  className="otp-input w-full rounded-xl border border-indigo-300 bg-white px-3.5 py-2.5 text-lg outline-none"
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-slate-600 hover:underline cursor-pointer"
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleResendOtp}
                    className="font-semibold text-indigo-700 hover:underline cursor-pointer"
                  >
                    Resend OTP
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="loading-spinner" />
                  Please wait...
                </>
              ) : otpSent ? (
                'Verify OTP & Create Account'
              ) : (
                'Send Verification OTP'
              )}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Registered Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                disabled={otpSent}
                value={form.email}
                onChange={handleChange}
                placeholder="you@gmail.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50"
              />
            </div>

            {otpSent && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    6-Digit OTP from Gmail
                  </label>
                  <input
                    type="text"
                    name="otp"
                    required
                    maxLength={6}
                    value={form.otp}
                    onChange={handleChange}
                    placeholder="123456"
                    className="otp-input w-full rounded-xl border border-indigo-300 bg-white px-3.5 py-2.5 text-lg outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    New Strong Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      name="newPassword"
                      required
                      value={form.newPassword}
                      onChange={handleChange}
                      placeholder="e.g. NewPass@2026"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-10 text-sm outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                      className="password-eye-btn absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <PasswordChecklist value={form.newPassword} />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleResendOtp}
                    className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Resend Reset OTP
                  </button>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="loading-spinner" />
                  Please wait...
                </>
              ) : otpSent ? (
                'Confirm OTP & Reset Password'
              ) : (
                'Send Reset OTP to Gmail'
              )}
            </button>
          </form>
        )}

        {mode !== 'forgot' && (
          <div className="mt-5">
            <div className="relative my-4 flex items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="mx-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Or continue with
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Sign-In was cancelled or failed.')}
                theme="outline"
                size="large"
                shape="pill"
                text={mode === 'register' ? 'signup_with' : 'signin_with'}
              />
            </div>
          </div>
        )}

        {mode === 'login' && (
          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="mb-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={() => quickDemoLogin('prof@joineazy.com')}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 cursor-pointer disabled:opacity-60"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Professor Demo
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => quickDemoLogin('gokul@joineazy.com')}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 cursor-pointer disabled:opacity-60"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                Student Demo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}