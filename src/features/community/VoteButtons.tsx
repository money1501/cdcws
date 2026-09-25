import { ArrowBigDown, ArrowBigUp } from 'lucide-react';
import { useState } from 'react';
import { removeVote, setVote } from '@/lib/community-api';
import { useAuthModal } from '@/lib/auth-modal-context';

interface VoteButtonsProps {
  boardId: string;
  score: number;
  myVote: 1 | -1 | null;
  onChange?: (result: { score: number; myVote: 1 | -1 | null }) => void;
}

function formatScore(score: number) {
  if (Math.abs(score) < 1000) return String(score);
  return `${(score / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

export function VoteButtons({ boardId, score, myVote, onChange }: VoteButtonsProps) {
  const [pending, setPending] = useState(false);
  const { requireAuth } = useAuthModal();

  async function executeVote(value: 1 | -1) {
    if (pending) return;
    setPending(true);
    try {
      const result =
        myVote === value
          ? await removeVote(boardId)
          : await setVote(boardId, value);
      onChange?.(result);
    } finally {
      setPending(false);
    }
  }

  function handleVote(value: 1 | -1) {
    requireAuth(() => executeVote(value), {
      reason: 'upvote',
      title: 'Log in to vote',
      description: 'Sign in to upvote and support boards from the Drawgon community.',
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 rounded-full bg-neutral-100 px-1 py-1.5 dark:bg-neutral-800/70">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          handleVote(1);
        }}
        disabled={pending}
        aria-pressed={myVote === 1}
        aria-label="Upvote"
        className={`rounded-full p-1 transition ${
          myVote === 1
            ? 'bg-upvote/15 text-upvote'
            : 'text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'
        }`}
      >
        <ArrowBigUp size={18} strokeWidth={2.25} fill={myVote === 1 ? 'currentColor' : 'none'} />
      </button>
      <span
        className={`min-w-[2ch] text-center text-xs font-bold tabular-nums ${
          myVote === 1
            ? 'text-upvote'
            : myVote === -1
              ? 'text-downvote'
              : 'text-neutral-700 dark:text-neutral-300'
        }`}
      >
        {formatScore(score)}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          handleVote(-1);
        }}
        disabled={pending}
        aria-pressed={myVote === -1}
        aria-label="Downvote"
        className={`rounded-full p-1 transition ${
          myVote === -1
            ? 'bg-downvote/15 text-downvote'
            : 'text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'
        }`}
      >
        <ArrowBigDown size={18} strokeWidth={2.25} fill={myVote === -1 ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
