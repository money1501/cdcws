import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Mail, RotateCw, Loader2, ArrowRight } from 'lucide-react';
import { authClient, signUp } from '@/lib/auth-client';
import { DrawgonMark } from '@/components/DrawgonMark';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { ThemeToggle } from '@/components/ThemeToggle';
import { hasPendingBoardSync } from '@/lib/board-stash';

export function SignupPage() {
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const { error: signUpError } = await signUp.email({
        name: trimmedName,
        email: targetEmail,
        password,
      });

      if (signUpError) {
        setError(signUpError.message ?? 'Could not create account.');
        return;
      }

      // Account created with emailVerified = false.
      // BetterAuth has automatically sent the 6-digit verification code to the email.
      setStep('verify');
      setCooldown(30);
      setOtpCode('');
    } catch (err: any) {
      setError(err?.message || 'Could not create account.');
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

      setStep('verify');
      setCooldown(30);
      setOtpCode('');
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification code.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendCode() {
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
        type: authMethod === 'password' ? 'email-verification' : 'sign-in',
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

  async function handleVerify(e: FormEvent) {
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
      if (authMethod === 'password') {
        // Verify email OTP for password-based signup
        const { error: verifyError } = await authClient.emailOtp.verifyEmail({
          email: targetEmail,
          otp: targetOtp,
        });

        if (verifyError) {
          setError(verifyError.message || 'Invalid or expired verification code.');
          return;
        }
      } else {
        // Passwordless OTP login/signup
        const { error: verifyError } = await authClient.signIn.emailOtp({
          email: targetEmail,
          otp: targetOtp,
        });

        if (verifyError) {
          setError(verifyError.message || 'Invalid or expired verification code.');
          return;
        }
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
            {step === 'verify' ? 'Verify your email' : 'Create your Boared account'}
          </h1>
          <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
            {step === 'verify'
              ? 'Enter the 6-digit verification code to activate your account.'
              : 'Join Boared to save, share, and collaborate on boards.'}
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

        {step === 'form' ? (
          <>
            {/* Google Sign-in/Sign-up */}
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
            <div className="relative my-4 flex items-center justify-center">
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

            {/* Password Signup Flow */}
            {authMethod === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <div>
                  <label
                    htmlFor="signup-name-input"
                    className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Name
                  </label>
                  <input
                    id="signup-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-email-input"
                    className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Email
                  </label>
                  <input
                    id="signup-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-password-input"
                    className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Password
                  </label>
                  <input
                    id="signup-password-input"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••• (min 8 chars)"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-50"
                >
                  {submitting ? 'Creating account…' : 'Sign up'}
                </button>
              </form>
            )}

            {/* Email OTP Signup Flow */}
            {authMethod === 'otp' && (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div>
                  <label
                    htmlFor="signup-otp-email-input"
                    className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Email Address
                  </label>
                  <input
                    id="signup-otp-email-input"
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
            )}
          </>
        ) : (
          /* Verification Step for both Password and OTP signups */
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
              <span>We sent a 6-digit verification code to </span>
              <strong className="text-neutral-900 dark:text-neutral-100">{email}</strong>
            </div>

            <div>
              <label
                htmlFor="signup-otp-code-input"
                className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Verification Code
              </label>
              <input
                id="signup-otp-code-input"
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
              {submitting ? 'Verifying…' : 'Verify & Continue'}
            </button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError(null);
                }}
                className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                ← Change email
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={cooldown > 0 || submitting}
                className="inline-flex items-center gap-1 text-brand hover:text-brand-hover disabled:text-neutral-400"
              >
                <RotateCw size={11} className={submitting ? 'animate-spin' : ''} />
                <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</span>
              </button>
            </div>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand hover:text-brand-hover">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
