import { Send } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { Comment } from '@shared/community';
import { addComment, listComments } from '@/lib/community-api';
import { Avatar } from '@/components/Avatar';
import { useAuthModal } from '@/lib/auth-modal-context';

export function CommentThread({ boardId }: { boardId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { requireAuth } = useAuthModal();

  useEffect(() => {
    listComments(boardId)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [boardId]);

  async function postComment() {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      const comment = await addComment(boardId, { body: body.trim() });
      setComments((prev) => [...prev, comment]);
      setBody('');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    requireAuth(() => postComment(), {
      reason: 'comment',
      title: 'Log in to post a comment',
      description: 'Sign in to join the conversation and leave feedback.',
    });
  }

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
        Comments{' '}
        {comments.length > 0 && (
          <span className="text-neutral-400 dark:text-neutral-500">({comments.length})</span>
        )}
      </h2>

      {loading && <p className="text-sm text-neutral-500">Loading comments...</p>}

      <ul className="mb-4 space-y-4">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-2.5">
            <Avatar name={comment.user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                  {comment.user.name}
                </span>
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm leading-snug text-neutral-700 dark:text-neutral-300">
                {comment.body}
              </p>
            </div>
          </li>
        ))}
        {!loading && comments.length === 0 && (
          <li className="text-sm text-neutral-500">No comments yet.</li>
        )}
      </ul>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 rounded-full border border-neutral-300 bg-neutral-100 px-4 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          aria-label="Post comment"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-hover disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
