import { ArrowBigUp, Bookmark, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { FeedItem } from "@shared/community";
import { Avatar } from "@/components/Avatar";
import {
  addBookmark,
  removeBookmark,
  removeVote,
  setVote,
} from "@/lib/community-api";

/**
 * Pinterest-flavoured feed tile: image-forward, no chrome until you hover,
 * at which point the save action and title overlay come forward.
 */
export function PinCard({ item }: { item: FeedItem }) {
  const [stats, setStats] = useState({
    score: item.score,
    myVote: item.myVote,
  });
  const [bookmarked, setBookmarked] = useState(item.bookmarked);
  const [pending, setPending] = useState(false);

  async function toggleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      if (bookmarked) {
        await removeBookmark(item.id);
        setBookmarked(false);
      } else {
        await addBookmark(item.id);
        setBookmarked(true);
      }
    } finally {
      setPending(false);
    }
  }

  async function toggleUpvote(e: React.MouseEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      setStats(
        stats.myVote === 1
          ? await removeVote(item.id)
          : await setVote(item.id, 1),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Link
      to={`/community/boards/${item.id}`}
      className="group mb-4 block break-inside-avoid"
    >
      <div className="relative overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            loading="lazy"
            /* Capped so one very tall board (a stack of imported PDF pages,
               say) cannot swallow an entire masonry column. */
            className="max-h-[420px] w-full object-cover object-top transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex aspect-4/3 items-center justify-center bg-gradient-to-br from-violet-500/15 to-cyan-500/15">
            <span className="px-4 text-center text-sm font-medium text-neutral-500">
              {item.title}
            </span>
          </div>
        )}

        {/* Hover scrim + actions */}
        <div className="pointer-events-none absolute inset-0 bg-neutral-950/0 transition group-hover:bg-neutral-950/35" />

        <button
          type="button"
          onClick={(e) => void toggleBookmark(e)}
          disabled={pending}
          aria-pressed={bookmarked}
          title={bookmarked ? "Saved" : "Save"}
          className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold opacity-0 shadow-md transition group-hover:opacity-100 focus-visible:opacity-100 ${
            bookmarked
              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
              : "bg-brand text-white hover:bg-brand-hover"
          }`}
        >
          <Bookmark size={13} fill={bookmarked ? "currentColor" : "none"} />
          {bookmarked ? "Saved" : "Save"}
        </button>

        <button
          type="button"
          onClick={(e) => void toggleUpvote(e)}
          disabled={pending}
          aria-pressed={stats.myVote === 1}
          title="Upvote"
          className={`absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold opacity-0 shadow-md transition group-hover:opacity-100 focus-visible:opacity-100 dark:bg-neutral-900/90 ${
            stats.myVote === 1
              ? "text-upvote"
              : "text-neutral-700 dark:text-neutral-200"
          }`}
        >
          <ArrowBigUp
            size={15}
            fill={stats.myVote === 1 ? "currentColor" : "none"}
          />
          {stats.score}
        </button>
      </div>

      <div className="mt-2 px-1">
        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          {item.title}
        </p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
          Board: {item.boardTitle}
        </p>
        {item.postDetails && (
          <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
            {item.postDetails}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          <Link
            to={`/users/${item.ownerId}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 transition hover:text-brand"
          >
            <Avatar name={item.ownerName} size="sm" />
            <span className="truncate">{item.ownerName}</span>
          </Link>
          <span aria-hidden="true">·</span>
          <MessageSquare size={12} />
          {item.commentCount}
        </div>
      </div>
    </Link>
  );
}
