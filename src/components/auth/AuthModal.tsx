import { useState, useEffect, type FormEvent } from 'react';
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
} from 'lucide-react';
import { signIn, signUp } from '@/lib/auth-client';
import { DrawgonMark } from '@/components/DrawgonMark';
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setMode(options?.initialMode ?? 'login');
      setError(null);
      setName('');
      setEmail('');
      setPassword('');
    }
  }, [isOpen, options]);

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

  const reason = options?.reason ?? 'general';
  const reasonInfo = REASON_CONFIG[reason];
  const Icon = reasonInfo.icon;
  const headingTitle = options?.title || reasonInfo.title;
  const headingDesc = options?.description || reasonInfo.description;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const { error: signInError } = await signIn.email({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message || 'Invalid email or password.');
          return;
        }
        toast.success('Logged in successfully!');
      } else {
        const trimmedName = name.trim();
        if (!trimmedName) {
          setError('Please provide your name.');
          return;
        }
        const { error: signUpError } = await signUp.email({
          name: trimmedName,
          email: email.trim(),
          password,
        });
        if (signUpError) {
          setError(signUpError.message || 'Failed to create account.');
          return;
        }
        toast.success('Account created and logged in!');
      }

      window.dispatchEvent(
        new CustomEvent('drawgon:auth-success', {
          detail: { email: email.trim() },
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
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
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
        <div className="mb-5">
          <div className="flex items-center gap-2">
            <DrawgonMark size={28} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand dark:bg-brand/20">
              <Icon size={12} />
              {reasonInfo.badge}
            </span>
          </div>

          <h2
            id="auth-modal-title"
            className="mt-3 text-lg font-bold text-neutral-900 dark:text-neutral-50"
          >
            {headingTitle}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            {headingDesc}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-4 flex rounded-xl border border-neutral-200 bg-neutral-100/80 p-1 dark:border-neutral-800 dark:bg-neutral-800/60">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              mode === 'login'
                ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-neutral-50'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              mode === 'signup'
                ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-neutral-50'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 animate-in fade-in"
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
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
            <label
              htmlFor="auth-password-input"
              className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
            >
              Password
            </label>
            <input
              id="auth-password-input"
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
            {submitting ? (
              <span>{mode === 'login' ? 'Signing in…' : 'Creating account…'}</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Continue with Email' : 'Sign Up & Save Board'}</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-4 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
          ✨ Your drawing is safely stored in memory and will transfer to your account immediately.
        </div>
      </div>
    </div>
  );
}
