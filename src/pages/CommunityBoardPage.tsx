import { ArrowLeft, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Editor } from "@tldraw/tldraw";
import type { FeedItemDetail } from "@shared/community";
import { getCommunityBoard, duplicateBoard } from "@/lib/community-api";
import { BoardCanvas } from "@/features/canvas/BoardCanvas";
import { ShareTray } from "@/features/share/ShareTray";
import { VoiceBar } from "@/features/voice/VoiceBar";
import { VoteButtons } from "@/features/community/VoteButtons";
import { CommentThread } from "@/features/community/CommentThread";
import { Avatar } from "@/components/Avatar";
import { DrawgonLoader } from "@/components/DrawgonLoader";
import { ThemeToggle } from "@/components/ThemeToggle";

export function CommunityBoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [item, setItem] = useState<FeedItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!boardId) return;
    getCommunityBoard(boardId)
      .then(setItem)
      .catch(() => setError("Board not found."));
  }, [boardId]);

  async function handleDuplicate() {
    if (!boardId || duplicating) return;
    setDuplicating(true);
    try {
      const copy = await duplicateBoard(boardId);
      navigate(`/boards/${copy.id}`);
    } finally {
      setDuplicating(false);
    }
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-neutral-500">{error}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm font-medium text-brand hover:text-brand-hover"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!item) {
    return <DrawgonLoader />;
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-3 dark:border-neutral-800">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              {item.title}
            </h1>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              Board: {item.boardTitle}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <Avatar name={item.ownerName} size="sm" />
              <span>by {item.ownerName}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <VoteButtons
            boardId={item.id}
            score={item.score}
            myVote={item.myVote}
            onChange={(result) => setItem({ ...item, ...result })}
          />
          <button
            type="button"
            onClick={() => void handleDuplicate()}
            disabled={duplicating}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <Copy size={14} />
            {duplicating ? "Duplicating..." : "Duplicate"}
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          <BoardCanvas
            boardId={item.id}
            initialSnapshot={item.snapshot}
            readOnly
            onEditorReady={setEditor}
          />
          <VoiceBar boardId={item.id} />
        </div>
        <div className="w-80 shrink-0 overflow-y-auto border-l border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
          {(item.postDetails ||
            item.postTags.length > 0 ||
            item.postMedia.length > 0) && (
            <article className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
              {item.postDetails && (
                <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-700 dark:text-neutral-200">
                  {item.postDetails}
                </p>
              )}
              {item.postTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.postTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              {item.postMedia.length > 0 && (
                <div className="mt-3 space-y-2">
                  {item.postMedia.map((media) =>
                    media.type.startsWith("image/") ? (
                      <img
                        key={media.name}
                        src={media.url}
                        alt={media.name}
                        className="w-full rounded-lg object-cover"
                      />
                    ) : (
                      <a
                        key={media.name}
                        href={media.url}
                        download={media.name}
                        className="block truncate text-sm text-brand hover:text-brand-hover"
                      >
                        {media.name}
                      </a>
                    ),
                  )}
                </div>
              )}
            </article>
          )}
          <CommentThread boardId={item.id} />
        </div>
      </div>
      <ShareTray
        editor={editor}
        title={item.title}
        ownerName={item.ownerName}
      />
    </div>
  );
}
