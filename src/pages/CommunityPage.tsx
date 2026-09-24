import { Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { CommunitySummary, FeedItem } from "@shared/community";
import {
  getCommunity,
  deleteCommunity,
  joinCommunity,
  leaveCommunity,
  listCommunityBoards,
} from "@/lib/communities-api";
import { BoardCard } from "@/features/community/BoardCard";
import { CommunityAvatar } from "@/features/community/CommunityAvatar";
import { DrawgonLoader } from "@/components/DrawgonLoader";

export function CommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  // Data is tagged with the slug it belongs to, so navigating between
  // communities can't show the previous one's boards while the next loads.
  const [data, setData] = useState<{
    slug: string;
    community: CommunitySummary;
    boards: FeedItem[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    Promise.all([getCommunity(slug), listCommunityBoards(slug)])
      .then(([community, boards]) => {
        if (!cancelled) setData({ slug, community, boards });
      })
      .catch(() => {
        if (!cancelled) setError("Community not found.");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const fresh = data && data.slug === slug ? data : null;
  const community = fresh?.community ?? null;
  const boards = fresh?.boards ?? [];

  async function toggleMembership() {
    if (!fresh || pending) return;
    setPending(true);
    try {
      const updated = fresh.community.joined
        ? await leaveCommunity(fresh.community.slug)
        : await joinCommunity(fresh.community.slug);
      setData({ ...fresh, community: updated });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!community || deleting) return;
    if (!window.confirm(`Delete d/${community.slug}? This cannot be undone.`))
      return;
    setDeleting(true);
    try {
      await deleteCommunity(community.slug);
      navigate("/communities");
    } finally {
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-neutral-500">{error}</p>
        <Link
          to="/communities"
          className="text-sm font-medium text-brand hover:text-brand-hover"
        >
          Browse communities
        </Link>
      </div>
    );
  }

  if (!community) {
    return <DrawgonLoader />;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-8 flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <CommunityAvatar slug={community.slug} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              d/{community.slug}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {community.name} · {community.memberCount}{" "}
              {community.memberCount === 1 ? "member" : "members"}
            </p>
            {community.description && (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                {community.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {community.role === "owner" && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                aria-label="Delete community"
                title="Delete community"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:text-neutral-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={() => void toggleMembership()}
              disabled={pending || community.role === "owner" || deleting}
              title={
                community.role === "owner"
                  ? "You own this community"
                  : undefined
              }
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:opacity-50 ${
                community.joined
                  ? "border border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  : "bg-brand text-white hover:bg-brand-hover"
              }`}
            >
              {community.role === "owner"
                ? "Owner"
                : community.joined
                  ? "Joined"
                  : "Join"}
            </button>
          </div>
        </header>

        {boards.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
            <Sparkles size={22} className="text-neutral-400" />
            <p className="text-neutral-500">
              Nothing posted to d/{community.slug} yet.
            </p>
            <p className="text-xs text-neutral-400">
              Publish a board and file it here from the board page.
            </p>
          </div>
        )}

        <ul className="space-y-3">
          {boards.map((item) => (
            <li key={item.id}>
              <BoardCard item={item} />
            </li>
          ))}
        </ul>
      </div>
  );
}
