import { useState, useEffect, useRef, type FormEvent } from 'react';
import {
  X,
  Lock,
  Download,
  Globe,
  Users,
  UploadCloud,
  MessageSquare,
  ArrowBigUp,
  Mic,
  Bookmark,
  Sparkles,
  ArrowRight,
  Mail,
  KeyRound,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { authClient, signIn, signUp } from '@/lib/auth-client';
import { DrawgonMark } from '@/components/DrawgonMark';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { useToast } from '@/components/toast/ToastProvider';
import type { AuthModalOptions, AuthReason } from '@/lib/auth-modal-context';

interface AuthModalProps {
  isOpen: boolean;
  options: AuthModalOptions | null;
  onClose: () => void;
}

const REASON_CONFIG: Record<
  AuthReason,
  {
    icon: typeof Lock;
    badge: string;
    title: string;
    description: string;
  }
> = {
  export: {
    icon: Download,
    badge: 'Export Gated',
    title: 'Log in to export your drawing',
    description: 'Download your high-resolution PNG, SVG, or PDF and access your boards from any device.',
  },
  publish: {
    icon: Globe,
    badge: 'Publish to Community',
    title: 'Log in to publish your board',
    description: 'Share your work with the Boared community and get feedback from creators worldwide.',
  },
  collaborate: {
    icon: Users,
    badge: 'Real-time Collaboration',
    title: 'Log in to invite collaborators',
    description: 'Work together live on the same canvas with cursors, permissions, and sync.',
  },
  upload: {
    icon: UploadCloud,
    badge: 'File Storage',
    title: 'Log in to upload documents',
    description: 'Embed PDFs, code files, spreadsheets, and private docs directly in your workspace.',
  },
  comment: {
    icon: MessageSquare,
    badge: 'Community Discussion',
    title: 'Log in to post a comment',
    description: 'Join the conversation, leave feedback, and ask questions on community boards.',
  },
  upvote: {
    icon: ArrowBigUp,
    badge: 'Community Feedback',
    title: 'Log in to vote',
    description: 'Support your favorite creators and help highlight the best community whiteboards.',
  },
  voice: {
    icon: Mic,
    badge: 'Live Audio',
    title: 'Log in for voice chat',
    description: 'Talk with your collaborators in real-time right inside the whiteboard.',
  },
  save: {
    icon: Bookmark,
    badge: 'Save Board',
    title: 'Save your whiteboard to your account',
    description: 'Keep your in-progress drawings permanently and access them anywhere.',
  },
  general: {
    icon: Sparkles,
    badge: 'Account Required',
    title: 'Log in to Boared',
    description: 'Create, collaborate, and share dynamic whiteboards effortlessly.',
  },
};

export function AuthModal({ isOpen, options, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [otpCode, setOtpCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      const initial = options?.initialMode ?? 'login';
      setMode(initial);
      setAuthMethod('password');
      setOtpStep('request');
      setIsVerifyingEmail(false);
      setIsResettingPassword(false);
      setResetStep('request');
      setOtpCode('');
      setCooldown(0);
      setError(null);
      setName('');
      setEmail('');
      setPassword('');
      setNewPassword('');
      setGoogleLoading(false);
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, options]);

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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function switchMode(newMode: 'login' | 'signup') {
    setMode(newMode);
    setPassword('');
    setNewPassword('');
    setError(null);
    setIsVerifyingEmail(false);
    setIsResettingPassword(false);
    setResetStep('request');
    setOtpStep('request');
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, 50);
  }

  const reason = options?.reason ?? 'general';
  const reasonInfo = REASON_CONFIG[reason];
  const Icon = reasonInfo.icon;

  const headingTitle = isResettingPassword
    ? resetStep === 'verify'
      ? 'Set new password'
      : 'Reset your password'
    : mode === 'signup'
      ? 'Create your Boared account'
      : (options?.title || reasonInfo.title);

  const headingDesc = isResettingPassword
    ? resetStep === 'verify'
      ? `Enter the code sent to ${email} and choose your new password.`
      : 'Enter your email address to receive a verification code and set a password.'
    : mode === 'signup'
      ? 'Join Boared to save, share, and collaborate on boards.'
      : (options?.description || reasonInfo.description);

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: window.location.href,
      });
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
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
        type: isVerifyingEmail ? 'email-verification' : 'sign-in',
      });

      if (otpError) {
        setError(otpError.message || 'Failed to send verification code.');
        return;
      }

      setOtpStep('verify');
      setCooldown(30);
      toast.info(`Verification code sent to ${targetEmail}`);
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
      if (isVerifyingEmail) {
        const { error: verifyError } = await authClient.emailOtp.verifyEmail({
          email: targetEmail,
          otp: targetOtp,
        });

        if (verifyError) {
          setError(verifyError.message || 'Invalid or expired code.');
          return;
        }

        toast.success('Email verified and signed in!');
        completeAuth(targetEmail);
      } else {
        const { error: verifyError } = await authClient.signIn.emailOtp({
          email: targetEmail,
          otp: targetOtp,
        });

        if (verifyError) {
          setError(verifyError.message || 'Invalid or expired code.');
          return;
        }

        toast.success('Signed in successfully!');
        completeAuth(targetEmail);
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
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
      toast.info(`Reset code sent to ${targetEmail}`);
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

      // Automatically sign in with the new password
      const { error: signInError } = await signIn.email({
        email: targetEmail,
        password: newPassword,
      });

      if (!signInError) {
        toast.success('Password updated and signed in!');
        completeAuth(targetEmail);
        return;
      }

      toast.success('Password set successfully! Please log in.');
      setIsResettingPassword(false);
      setResetStep('request');
      setPassword(newPassword);
    } catch (err: any) {
      setError(err?.message || 'Failed to set password. Please try again.');
    } finally {
      setSubmitting(false);
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
      if (mode === 'login') {
        const { error: signInError } = await signIn.email({
          email: targetEmail,
          password,
        });
        if (signInError) {
          if (
            signInError.code === 'EMAIL_NOT_VERIFIED' ||
            signInError.message?.toLowerCase().includes('not verified')
          ) {
            setIsVerifyingEmail(true);
            setOtpStep('verify');
            setCooldown(30);
            setOtpCode('');
            toast.info(`Please verify your email. Code sent to ${targetEmail}`);
            return;
          }
          setError(
            'Wrong email or password. If you signed up with an email code or Google, use that method, or choose Forgot password to set a password.',
          );
          return;
        }
        toast.success('Logged in successfully!');
        completeAuth(targetEmail);
      } else {
        const trimmedName = name.trim();
        if (!trimmedName) {
          setError('Please provide your name.');
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters.');
          return;
        }
        const { error: signUpError } = await signUp.email({
          name: trimmedName,
          email: targetEmail,
          password,
        });
        if (signUpError) {
          setError(signUpError.message || 'Failed to create account.');
          return;
        }
        // Account created with emailVerified = false. BetterAuth sent the verification code.
        setIsVerifyingEmail(true);
        setOtpStep('verify');
        setCooldown(30);
        setOtpCode('');
        toast.info(`Verification code sent to ${targetEmail}`);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function completeAuth(authEmail: string) {
    window.dispatchEvent(
      new CustomEvent('drawgon:auth-success', {
        detail: { email: authEmail },
      }),
    );

    onClose();

    if (options?.onSuccess) {
      try {
        await options.onSuccess();
      } catch (err) {
        console.error('Error in post-auth action callback:', err);
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-[200000] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95 dark:border-neutral-800 dark:bg-neutral-900">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <X size={16} />
        </button>

        {/* Header with Reason Badge */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <DrawgonMark size={28} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand dark:bg-brand/20">
              <Icon size={12} />
              {reasonInfo.badge}
            </span>
          </div>

          <h2
            id="auth-modal-title"
            className="mt-2.5 text-lg font-bold text-neutral-900 dark:text-neutral-50"
          >
            {headingTitle}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            {headingDesc}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-3.5 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 animate-in fade-in"
          >
            {error}
          </div>
        )}

        {/* Mode Branching */}
        {isResettingPassword ? (
          /* Forgot Password Flow */
          resetStep === 'request' ? (
            <form onSubmit={handleSendResetOtp} className="space-y-3">
              <div>
                <label
                  htmlFor="auth-reset-email-input"
                  className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Email Address
                </label>
                <input
                  ref={emailInputRef}
                  id="auth-reset-email-input"
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
                    setTimeout(() => emailInputRef.current?.focus(), 50);
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
                  htmlFor="auth-reset-otp-input"
                  className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                >
                  6-Digit Verification Code
                </label>
                <input
                  id="auth-reset-otp-input"
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
                  htmlFor="auth-new-password-input"
                  className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                >
                  New Password
                </label>
                <input
                  id="auth-new-password-input"
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
                {submitting ? 'Setting password…' : 'Set Password & Sign In'}
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
        ) : !isVerifyingEmail && otpStep === 'request' ? (
          <div className="transition-opacity duration-150">
            {/* Google OAuth Button */}
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

            {/* Method Switcher: Password vs Email OTP */}
            <div className="mb-3.5 flex items-center justify-center gap-4 text-xs font-medium text-neutral-500">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('password');
                  setError(null);
                  setTimeout(() => emailInputRef.current?.focus(), 50);
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
                  setTimeout(() => emailInputRef.current?.focus(), 50);
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

            {/* Form: Password Mode */}
            {authMethod === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="auth-name-input"
                      className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                    >
                      Full Name
                    </label>
                    <input
                      id="auth-name-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ada Lovelace"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email-input"
                    className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Email Address
                  </label>
                  <input
                    ref={emailInputRef}
                    id="auth-email-input"
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
                      htmlFor="auth-password-input"
                      className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                    >
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsResettingPassword(true);
                          setResetStep('request');
                          setError(null);
                          setTimeout(() => emailInputRef.current?.focus(), 50);
                        }}
                        className="text-xs text-brand hover:underline underline-offset-2"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="auth-password-input"
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
                  {submitting ? (
                    <span>{mode === 'login' ? 'Signing in…' : 'Creating account…'}</span>
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Continue with Password' : 'Create account'}</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Form: Email OTP Mode (Request) */}
            {authMethod === 'otp' && (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div>
                  <label
                    htmlFor="auth-otp-email-input"
                    className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Email Address
                  </label>
                  <input
                    ref={emailInputRef}
                    id="auth-otp-email-input"
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

            {/* Mode Switcher Link */}
            <p className="mt-4 text-center text-[13px] text-neutral-500 dark:text-neutral-400">
              {mode === 'login' ? (
                <>
                  <span>New to Boared? </span>
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-medium text-brand hover:underline underline-offset-2 transition hover:text-brand-hover"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-medium text-brand hover:underline underline-offset-2 transition hover:text-brand-hover"
                  >
                    Log in
                  </button>
                </>
              )}
            </p>
          </div>
        ) : (
          /* Verification View for Password Signup, Unverified Login, and OTP Sign-in */
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <div className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
              <span>Enter the 6-digit code sent to </span>
              <strong className="text-neutral-900 dark:text-neutral-100">{email}</strong>
            </div>

            <div>
              <label
                htmlFor="auth-otp-code-input"
                className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Verification Code
              </label>
              <input
                id="auth-otp-code-input"
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
                  setIsVerifyingEmail(false);
                  setOtpStep('request');
                  setError(null);
                }}
                className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                ← Back
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

        {/* Footer info */}
        <div className="mt-4 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
          ✨ Your drawing is safely stored in memory and will transfer to your account immediately.
        </div>
      </div>
    </div>
  );
}

