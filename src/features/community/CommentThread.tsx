import { MessageSquare, Send } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { Comment } from "@shared/community";
import { addComment, listComments } from "@/lib/community-api";
import { Avatar } from "@/components/Avatar";
import { useAuthModal } from "@/lib/auth-modal-context";
import { useSession } from "@/lib/auth-client";

export function CommentThread({ boardId }: { boardId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { data: session } = useSession();
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
      setBody("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    requireAuth(() => postComment(), {
      reason: "comment",
      title: "Log in to post a comment",
      description: "Sign in to join the conversation and leave feedback.",
    });
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          <MessageSquare size={18} />
          <span>Comments</span>
          {comments.length > 0 && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {comments.length}
            </span>
          )}
        </h2>
      </div>

      {/* ── Add Comment Form ── */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="hidden sm:block shrink-0 pt-0.5">
            <Avatar
              name={session?.user?.name || "Guest"}
              size="md"
            />
          </div>

          <div className="min-w-0 flex-1">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment... (share thoughts, feedback, or ask questions)"
              rows={2}
              className="w-full resize-none bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit(e);
                }
              }}
            />

            <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800/80">
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Press Cmd/Ctrl + Enter to send
              </span>
              <button
                type="submit"
                disabled={submitting || !body.trim()}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-hover disabled:opacity-40"
              >
                <Send size={12} />
                <span>{submitting ? "Posting..." : "Comment"}</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ── Comments List ── */}
      {loading && (
        <div className="py-8 text-center text-sm text-neutral-500">
          Loading comments...
        </div>
      )}

      {!loading && comments.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 py-12 text-center dark:border-neutral-800">
          <MessageSquare size={24} className="text-neutral-400 dark:text-neutral-600" />
          <p className="mt-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            No comments yet
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Be the first to share your thoughts on this board!
          </p>
        </div>
      )}

      {!loading && comments.length > 0 && (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="flex items-start gap-3.5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900"
            >
              <Link
                to={`/users/${comment.userId}`}
                className="shrink-0 transition hover:opacity-80"
              >
                <Avatar name={comment.user.name} size="md" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <Link
                    to={`/users/${comment.userId}`}
                    className="text-sm font-semibold text-neutral-900 hover:text-brand dark:text-neutral-100"
                  >
                    {comment.user.name}
                  </Link>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    {new Date(comment.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
                  {comment.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
