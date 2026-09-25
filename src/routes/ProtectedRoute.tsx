import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/api-client';
import { DrawgonLoader } from '@/components/DrawgonLoader';

/**
 * A session check that never settles used to leave this route spinning
 * forever — the exact failure when the deployed bundle points at an API that
 * isn't there (an unset VITE_API_URL falls back to http://localhost:3000, and
 * an HTTPS page blocks that as mixed content before the request is even sent).
 * Cap the wait so an unreachable backend surfaces as a message, not a hang.
 */
const SESSION_TIMEOUT_MS = 10_000;

function UnreachableBackend({ detail }: { detail: string }) {
  const isLocalhostApi = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(API_BASE_URL);

  return (
    <div
      role="alert"
      className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-50 px-6 text-center dark:bg-neutral-950"
    >
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        Can't reach the server
      </h1>
      <p className="max-w-md text-sm text-neutral-500 dark:text-neutral-400">
        Boared couldn't confirm your session with{' '}
        <code className="rounded bg-neutral-200 px-1 py-0.5 text-xs dark:bg-neutral-800">
          {API_BASE_URL}
        </code>
        .
      </p>
      {isLocalhostApi && window.location.hostname !== 'localhost' && (
        <p className="max-w-md text-sm text-amber-700 dark:text-amber-500">
          This build is pointed at localhost, so it only works on the machine
          running the backend. Set <code>VITE_API_URL</code> to the deployed API
          and rebuild.
        </p>
      )}
      <p className="max-w-md text-xs text-neutral-400 dark:text-neutral-600">{detail}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-50 hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        Try again
      </button>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data, isPending, error } = useSession();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isPending) return;
    const timer = setTimeout(() => setTimedOut(true), SESSION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isPending]);

  if (error) {
    return <UnreachableBackend detail={error.message ?? 'The session request failed.'} />;
  }

  if (isPending) {
    return timedOut ? (
      <UnreachableBackend detail="The session request timed out after 10 seconds." />
    ) : (
      <DrawgonLoader />
    );
  }

  if (!data) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
