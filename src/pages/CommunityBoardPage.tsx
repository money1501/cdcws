import {
  ArrowLeft,
  Bookmark,
  Copy,
  ExternalLink,
  PenTool,
  Share2,
  Tag as TagIcon,
  Clock,
  Download,
  FileText,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { FeedItemDetail } from "@shared/community";
import {
  getCommunityBoard,
  duplicateBoard,
  addBookmark,
  removeBookmark,
} from "@/lib/community-api";
import { VoteButtons } from "@/features/community/VoteButtons";
import { CommentThread } from "@/features/community/CommentThread";
import { Avatar } from "@/components/Avatar";
import { DrawgonLoader } from "@/components/DrawgonLoader";
import { useToast } from "@/components/toast/ToastProvider";

export function CommunityBoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [item, setItem] = useState<FeedItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

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
      toast.success("Board duplicated!");
      navigate(`/boards/${copy.id}`);
    } catch {
      toast.error("Failed to duplicate board.");
    } finally {
      setDuplicating(false);
    }
  }

  async function toggleBookmark() {
    if (!item || bookmarkPending) return;
    setBookmarkPending(true);
    try {
      if (item.bookmarked) {
        await removeBookmark(item.id);
        setItem({ ...item, bookmarked: false });
        toast.info("Removed from saved boards");
      } else {
        await addBookmark(item.id);
        setItem({ ...item, bookmarked: true });
        toast.success("Saved to your collection");
      }
    } catch {
      toast.error("Failed to update bookmark.");
    } finally {
      setBookmarkPending(false);
    }
  }

  function handleShare() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  }

  function openLiveCanvas() {
    if (!item) return;
    navigate(`/boards/${item.id}`);
  }

  if (error) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-neutral-500">{error}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover"
        >
          <ArrowLeft size={16} />
          Go back
        </button>
      </div>
    );
  }

  if (!item) {
    return <DrawgonLoader />;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* ── Back Navigation & Actions Bar ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-600 shadow-xs transition hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 shadow-xs transition hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <Share2 size={13} />
            <span>Share</span>
          </button>
          <button
            type="button"
            onClick={() => void handleDuplicate()}
            disabled={duplicating}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 shadow-xs transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <Copy size={13} />
            <span>{duplicating ? "Duplicating..." : "Duplicate"}</span>
          </button>
          <button
            type="button"
            onClick={openLiveCanvas}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-hover"
          >
            <PenTool size={13} />
            <span>Open Canvas</span>
          </button>
        </div>
      </div>

      {/* ── Two-Column Layout (Header & Content) ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* ── Left Column: Static Preview Image + Vote / Bookmark ── */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <div
            onDoubleClick={openLiveCanvas}
            className="group relative flex min-h-[320px] max-h-[520px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100/80 shadow-sm transition hover:border-brand/50 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/80"
            title="Double-click to open live board"
          >
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt={item.title}
                className="max-h-[520px] w-full object-contain bg-white transition duration-300 group-hover:scale-[1.01] dark:bg-neutral-950"
              />
            ) : (
              <div className="flex aspect-16/10 w-full flex-col items-center justify-center bg-gradient-to-br from-violet-500/15 via-brand/10 to-cyan-500/15 p-8 text-center">
                <span className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
                  {item.title}
                </span>
                <span className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Board: {item.boardTitle}
                </span>
              </div>
            )}

            {/* Hover overlay hint */}
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-neutral-950/60 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-xs dark:bg-white/90 dark:text-neutral-900">
                <ExternalLink size={13} />
                Double-click to open live board
              </span>
            </div>
          </div>

          {/* Upvote / Downvote & Save Controls directly below preview */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <VoteButtons
                boardId={item.id}
                score={item.score}
                myVote={item.myVote}
                onChange={(result) => setItem({ ...item, ...result })}
              />

              <button
                type="button"
                onClick={() => void toggleBookmark()}
                disabled={bookmarkPending}
                aria-pressed={item.bookmarked}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition ${
                  item.bookmarked
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
              >
                <Bookmark
                  size={14}
                  fill={item.bookmarked ? "currentColor" : "none"}
                />
                <span>{item.bookmarked ? "Saved" : "Save"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Column: Author Info, Title, Tags, Description, Media ── */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5">
          {/* Author info & post date (ABOVE title) */}
          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3.5 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
            <Link
              to={`/users/${item.ownerId}`}
              className="group flex items-center gap-2.5 transition"
            >
              <Avatar name={item.ownerName} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900 group-hover:text-brand dark:text-neutral-100">
                  {item.ownerName}
                </p>
                <p className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                  <Clock size={11} />
                  <span>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
                </p>
              </div>
            </Link>
          </div>

          {/* Title & Board name */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
              {item.title}
            </h1>
            {item.boardTitle && item.boardTitle !== item.title && (
              <p className="mt-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Board: {item.boardTitle}
              </p>
            )}
          </div>

          {/* Tags */}
          {item.postTags && item.postTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.postTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  <TagIcon size={11} className="opacity-60" />
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {item.postDetails && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Description
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
                {item.postDetails}
              </p>
            </div>
          )}

          {/* Attached Media */}
          {item.postMedia && item.postMedia.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Attachments ({item.postMedia.length})
              </h2>
              <div className="space-y-2">
                {item.postMedia.map((media) =>
                  media.type.startsWith("image/") ? (
                    <div
                      key={media.name}
                      className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
                    >
                      <img
                        src={media.url}
                        alt={media.name}
                        className="max-h-48 w-full object-cover"
                      />
                      <div className="flex items-center justify-between bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        <span className="truncate">{media.name}</span>
                        <a
                          href={media.url}
                          download={media.name}
                          className="text-brand hover:text-brand-hover"
                          title="Download"
                        >
                          <Download size={13} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <a
                      key={media.name}
                      href={media.url}
                      download={media.name}
                      className="flex items-center justify-between rounded-lg border border-neutral-200 p-2.5 text-xs text-neutral-700 transition hover:border-brand hover:text-brand dark:border-neutral-800 dark:text-neutral-200"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={15} className="text-neutral-400" />
                        <span className="truncate">{media.name}</span>
                      </div>
                      <Download size={13} className="shrink-0" />
                    </a>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="mt-auto pt-2">
            <button
              type="button"
              onClick={openLiveCanvas}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover active:scale-[0.99]"
            >
              <PenTool size={16} />
              <span>Open in Live Canvas</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Full-Width Comments Section ── */}
      <div className="mt-12 border-t border-neutral-200 pt-8 dark:border-neutral-800">
        <CommentThread boardId={item.id} />
      </div>
    </div>
  );
}
