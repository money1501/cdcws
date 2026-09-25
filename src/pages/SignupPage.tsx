import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '@/lib/auth-client';
import { DrawgonMark } from '@/components/DrawgonMark';
import { ThemeToggle } from '@/components/ThemeToggle';

export function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signUpError } = await signUp.email({ name, email, password });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message ?? 'Could not create account.');
      return;
    }
    navigate('/');
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="mb-6 flex flex-col items-center gap-2">
          <DrawgonMark size={44} />
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            Create your Boared account
          </h1>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-neutral-700 dark:text-neutral-300">
            Name
          </span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </label>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-neutral-700 dark:text-neutral-300">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-neutral-700 dark:text-neutral-300">
            Password
          </span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {submitting ? 'Creating account...' : 'Sign up'}
        </button>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand hover:text-brand-hover">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
