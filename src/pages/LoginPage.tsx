import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Mail, RotateCw, Loader2, ArrowRight } from 'lucide-react';
import { authClient, signIn } from '@/lib/auth-client';
import { DrawgonMark } from '@/components/DrawgonMark';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { ThemeToggle } from '@/components/ThemeToggle';
import { hasPendingBoardSync } from '@/lib/board-stash';

export function LoginPage() {
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [isVerifyingUnverifiedEmail, setIsVerifyingUnverifiedEmail] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [otpCode, setOtpCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => {
        setCooldown((c) => c - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      const url = new URL(window.location.origin + '/');
      if (hasPendingBoardSync()) {
        url.searchParams.set('resume', 'save');
      }
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: url.toString(),
      });
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError('Please enter your email address.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await signIn.email({
        email: targetEmail,
        password,
      });

      if (signInError) {
        if (
          signInError.code === 'EMAIL_NOT_VERIFIED' ||
          signInError.message?.toLowerCase().includes('not verified')
        ) {
          // Account unverified: BetterAuth automatically dispatched a new OTP code
          setIsVerifyingUnverifiedEmail(true);
          setCooldown(30);
          setOtpCode('');
          setError(null);
          return;
        }
        setError(
          'Wrong email or password. If you signed up with an email code or Google, use that method, or choose Forgot password to set a password.',
        );
        return;
      }

      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Could not log in.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendResetOtp(e?: FormEvent) {
    if (e) e.preventDefault();
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError('Please enter your email address.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const { error: otpError } = await authClient.emailOtp.sendVerificationOtp({
        email: targetEmail,
        type: 'forget-password',
      });

      if (otpError) {
        setError(otpError.message || 'Failed to send reset code.');
        return;
      }

      setResetStep('verify');
      setCooldown(30);
      setOtpCode('');
      setNewPassword('');
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset code.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    const targetEmail = email.trim().toLowerCase();
    const targetOtp = otpCode.trim();
    if (!targetOtp || targetOtp.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const { error: resetError } = await authClient.emailOtp.resetPassword({
        email: targetEmail,
        otp: targetOtp,
        password: newPassword,
      });

      if (resetError) {
        setError(resetError.message || 'Failed to set password. The code may be invalid or expired.');
        return;
      }

      const { error: signInError } = await signIn.email({
        email: targetEmail,
        password: newPassword,
      });

      if (!signInError) {
        navigate('/');
        return;
      }

      setIsResettingPassword(false);
      setResetStep('request');
      setPassword(newPassword);
    } catch (err: any) {
      setError(err?.message || 'Failed to set password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyUnverifiedEmailOtp(e: FormEvent) {
    e.preventDefault();
    const targetEmail = email.trim().toLowerCase();
    const targetOtp = otpCode.trim();
    if (!targetOtp || targetOtp.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email: targetEmail,
        otp: targetOtp,
      });

      if (verifyError) {
        setError(verifyError.message || 'Invalid or expired verification code.');
        return;
      }

      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendUnverifiedEmailOtp() {
    if (cooldown > 0 || submitting) return;
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError('Please enter your email address.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const { error: otpError } = await authClient.emailOtp.sendVerificationOtp({
        email: targetEmail,
        type: 'email-verification',
      });

      if (otpError) {
        setError(otpError.message || 'Failed to resend verification code.');
        return;
      }

      setCooldown(30);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification code.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendOtp(e?: FormEvent) {
    if (e) e.preventDefault();
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError('Please enter your email address.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const { error: otpError } = await authClient.emailOtp.sendVerificationOtp({
        email: targetEmail,
        type: 'sign-in',
      });

      if (otpError) {
        setError(otpError.message || 'Failed to send verification code.');
        return;
      }

      setOtpStep('verify');
      setCooldown(30);
      setOtpCode('');
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification code.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    const targetEmail = email.trim().toLowerCase();
    const targetOtp = otpCode.trim();
    if (!targetOtp || targetOtp.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const { error: verifyError } = await authClient.signIn.emailOtp({
        email: targetEmail,
        otp: targetOtp,
      });

      if (verifyError) {
        setError(verifyError.message || 'Invalid or expired code.');
        return;
      }

      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-6 flex flex-col items-center gap-2">
          <DrawgonMark size={44} />
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            {isResettingPassword
              ? resetStep === 'verify'
                ? 'Set new password'
                : 'Reset your password'
              : isVerifyingUnverifiedEmail
                ? 'Verify your email'
                : 'Log in to Boared'}
          </h1>
          <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
            {isResettingPassword
              ? resetStep === 'verify'
                ? `Enter the code sent to ${email} and choose your new password.`
                : 'Enter your email address to receive a verification code and set a password.'
              : isVerifyingUnverifiedEmail
                ? 'Your email is not verified yet. Enter the code sent to your inbox to activate and log in.'
                : 'Welcome back! Choose your preferred sign-in method.'}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {isResettingPassword ? (
          resetStep === 'request' ? (
            <form onSubmit={handleSendResetOtp} className="space-y-3">
              <div>
                <label
                  htmlFor="login-reset-email-input"
                  className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Email Address
                </label>
                <input
                  ref={emailInputRef}
                  id="login-reset-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-50"
              >
                {submitting ? (
                  <span>Sending Reset Code…</span>
                ) : (
                  <>
                    <span>Send 6-Digit Reset Code</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsResettingPassword(false);
                    setError(null);
                  }}
                  className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  ← Back to log in
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
                <span>Enter the 6-digit code sent to </span>
                <strong className="text-neutral-900 dark:text-neutral-100">{email}</strong>
                <span> to set your password.</span>
              </div>

              <div>
                <label
                  htmlFor="login-reset-otp-input"
                  className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                >
                  6-Digit Verification Code
                </label>
                <input
                  id="login-reset-otp-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-center font-mono text-xl tracking-[0.3em] text-neutral-900 placeholder:text-neutral-300 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div>
                <label
                  htmlFor="login-new-password-input"
                  className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                >
                  New Password
                </label>
                <input
                  id="login-new-password-input"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="•••••••• (min 8 chars)"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || otpCode.length < 6 || newPassword.length < 8}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-50"
              >
                {submitting ? 'Setting password…' : 'Set Password & Log in'}
              </button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setResetStep('request');
                    setError(null);
                  }}
                  className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={() => void handleSendResetOtp()}
                  disabled={cooldown > 0 || submitting}
                  className="inline-flex items-center gap-1 text-brand hover:text-brand-hover disabled:text-neutral-400"
                >
                  <RotateCw size={11} className={submitting ? 'animate-spin' : ''} />
                  <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</span>
                </button>
              </div>
            </form>
          )
        ) : isVerifyingUnverifiedEmail ? (
          /* Unverified password account verification form */
          <form onSubmit={handleVerifyUnverifiedEmailOtp} className="space-y-3">
            <div className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
              <span>We sent a 6-digit verification code to </span>
              <strong className="text-neutral-900 dark:text-neutral-100">{email}</strong>
            </div>

            <div>
              <label
                htmlFor="unverified-otp-code-input"
                className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Verification Code
              </label>
              <input
                id="unverified-otp-code-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-center font-mono text-xl tracking-[0.3em] text-neutral-900 placeholder:text-neutral-300 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || otpCode.length < 6}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-50"
            >
              {submitting ? 'Verifying…' : 'Verify & Log in'}
            </button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsVerifyingUnverifiedEmail(false);
                  setError(null);
                }}
                className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={() => void handleResendUnverifiedEmailOtp()}
                disabled={cooldown > 0 || submitting}
                className="inline-flex items-center gap-1 text-brand hover:text-brand-hover disabled:text-neutral-400"
              >
                <RotateCw size={11} className={submitting ? 'animate-spin' : ''} />
                <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</span>
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Google OAuth (Option 1) */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || submitting}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-300 bg-white py-2.5 text-xs font-semibold text-neutral-700 shadow-xs transition hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-750"
            >
              {googleLoading ? (
                <Loader2 size={16} className="animate-spin text-brand" />
              ) : (
                <GoogleIcon className="h-4 w-4 shrink-0" />
              )}
              <span>{googleLoading ? 'Connecting to Google…' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative my-5 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500">
                or with email
              </span>
            </div>

            {/* Method Switcher: Password vs OTP */}
            <div className="mb-4 flex items-center justify-center gap-4 text-xs font-medium text-neutral-500">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('password');
                  setError(null);
                }}
                className={`inline-flex items-center gap-1.5 border-b-2 pb-1 transition ${
                  authMethod === 'password'
                    ? 'border-brand font-semibold text-brand'
                    : 'border-transparent hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <KeyRound size={13} />
                <span>Password</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('otp');
                  setOtpStep('request');
                  setError(null);
                }}
                className={`inline-flex items-center gap-1.5 border-b-2 pb-1 transition ${
                  authMethod === 'otp'
                    ? 'border-brand font-semibold text-brand'
                    : 'border-transparent hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Mail size={13} />
                <span>Email Code (OTP)</span>
              </button>
            </div>

            {/* Password Login Flow */}
            {authMethod === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <div>
                  <label
                    htmlFor="login-email-input"
                    className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Email
                  </label>
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="login-password-input"
                      className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResettingPassword(true);
                        setResetStep('request');
                        setError(null);
                      }}
                      className="text-xs text-brand hover:underline underline-offset-2"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="login-password-input"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-50"
                >
                  {submitting ? 'Logging in…' : 'Log in'}
                </button>
              </form>
            )}

            {/* Email OTP Login Flow */}
            {authMethod === 'otp' && (
              <div>
                {otpStep === 'request' ? (
                  <form onSubmit={handleSendOtp} className="space-y-3">
                    <div>
                      <label
                        htmlFor="login-otp-email-input"
                        className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                      >
                        Email Address
                      </label>
                      <input
                        id="login-otp-email-input"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-50"
                    >
                      {submitting ? (
                        <span>Sending Code…</span>
                      ) : (
                        <>
                          <span>Send 6-Digit Code</span>
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <div className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
                      <span>Enter the 6-digit code sent to </span>
                      <strong className="text-neutral-900 dark:text-neutral-100">{email}</strong>
                    </div>

                    <div>
                      <label
                        htmlFor="login-otp-code-input"
                        className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                      >
                        Verification Code
                      </label>
                      <input
                        id="login-otp-code-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        required
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-center font-mono text-xl tracking-[0.3em] text-neutral-900 placeholder:text-neutral-300 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || otpCode.length < 6}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-50"
                    >
                      {submitting ? 'Verifying…' : 'Verify & Log in'}
                    </button>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setOtpStep('request')}
                        className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                      >
                        ← Change email
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleSendOtp()}
                        disabled={cooldown > 0 || submitting}
                        className="inline-flex items-center gap-1 text-brand hover:text-brand-hover disabled:text-neutral-400"
                      >
                        <RotateCw size={11} className={submitting ? 'animate-spin' : ''} />
                        <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </>
        )}

        <p className="mt-5 text-center text-sm text-neutral-500">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-brand hover:text-brand-hover">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
