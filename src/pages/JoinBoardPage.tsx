import { Loader2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinBoardViaToken } from '@/lib/boards-api';
import { useToast } from '@/components/toast/ToastProvider';
import { DrawgonMark } from '@/components/DrawgonMark';

export function JoinBoardPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [joining, setJoining] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-join immediately on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid invite link.');
      return;
    }
    setJoining(true);
    joinBoardViaToken(token)
      .then(({ boardId }) => {
        setDone(true);
        toast.success('You joined the board!');
        setTimeout(() => navigate(`/boards/${boardId}`), 1200);
      })
      .catch((err) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'This invite link is invalid or has expired.';
        setError(msg);
      })
      .finally(() => setJoining(false));
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <div className="mb-8">
        <DrawgonMark size={40} />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        {joining && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
              <Loader2 size={24} className="animate-spin text-brand" />
            </div>
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Joining board…
            </p>
            <p className="text-sm text-neutral-500">Please wait while we add you as a collaborator.</p>
          </div>
        )}

        {done && !joining && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
              <Users size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              You're in! 🎉
            </p>
            <p className="text-sm text-neutral-500">Redirecting you to the board…</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
              <Users size={24} className="text-red-500 dark:text-red-400" />
            </div>
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Link invalid
            </p>
            <p className="text-sm text-neutral-500">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover"
            >
              Go to my boards
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
