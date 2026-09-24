import { Search, Sparkles, Users, LayoutGrid, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { FeedItem } from "@shared/community";
import type { UserSearchResult } from "@shared/user";
import { listCommunityFeed } from "@/lib/community-api";
import { searchUsers } from "@/lib/users-api";
import { PinCard } from "@/features/community/PinCard";
import { DrawgonLoader } from "@/components/DrawgonLoader";

// ── User result card ──────────────────────────────────────────────────────────
function UserResultCard({ user }: { user: UserSearchResult }) {
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link
      to={`/users/${user.userId}`}
      className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition-all hover:border-brand hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-brand"
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="h-11 w-11 flex-shrink-0 rounded-full object-cover ring-2 ring-transparent transition group-hover:ring-brand"
        />
      ) : (
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand/80 to-purple-500 text-sm font-semibold text-white ring-2 ring-transparent transition group-hover:ring-brand">
          {initials}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {user.name}
        </p>
        {user.username && (
          <p className="truncate text-xs text-brand">@{user.username}</p>
        )}
        {user.bio && (
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
            {user.bio}
          </p>
        )}
      </div>

      <User
        size={14}
        className="flex-shrink-0 text-neutral-300 transition group-hover:text-brand dark:text-neutral-600"
      />
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function CommunityFeedPage() {
  const [boards, setBoards] = useState<FeedItem[]>([]);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"boards" | "people">("boards");

  const isSearching = query.trim().length > 0;

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const [boardResults, userResults] = await Promise.all([
          listCommunityFeed(query.trim() || undefined),
          isSearching ? searchUsers(query.trim()) : Promise.resolve<UserSearchResult[]>([]),
        ]);
        setBoards(boardResults);
        setUsers(userResults);
        if (isSearching) {
          if (userResults.length > 0 && boardResults.length === 0) {
            setActiveTab("people");
          } else {
            setActiveTab("boards");
          }
        }
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!isSearching) setActiveTab("boards");
  }, [isSearching]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Search bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-auto sm:flex-1 sm:max-w-md">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search boards or people…"
              aria-label="Search boards or people"
              className="w-full rounded-full border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>
        </div>
      </div>

      {/* Tabs — only shown while typing */}
      {isSearching && !loading && (
        <div className="mb-5 flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-900/60 sm:w-fit">
          <button
            onClick={() => setActiveTab("boards")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
              activeTab === "boards"
                ? "bg-white text-neutral-900 shadow dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            <LayoutGrid size={13} />
            Boards
            {boards.length > 0 && (
              <span className="ml-0.5 rounded-full bg-brand/10 px-1.5 py-px text-xs font-semibold text-brand">
                {boards.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("people")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
              activeTab === "people"
                ? "bg-white text-neutral-900 shadow dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            <Users size={13} />
            People
            {users.length > 0 && (
              <span className="ml-0.5 rounded-full bg-brand/10 px-1.5 py-px text-xs font-semibold text-brand">
                {users.length}
              </span>
            )}
          </button>
        </div>
      )}

      {loading && <DrawgonLoader fullScreen={false} size={72} />}

      {/* People results */}
      {!loading && isSearching && activeTab === "people" && (
        <>
          {users.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 py-20 text-center dark:border-neutral-700">
              <Users size={22} className="text-neutral-400" />
              <p className="text-neutral-500">No people match &ldquo;{query}&rdquo;.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => (
                <UserResultCard key={u.userId} user={u} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Board results */}
      {!loading && (!isSearching || activeTab === "boards") && (
        <>
          {boards.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 py-20 text-center dark:border-neutral-700">
              <Sparkles size={22} className="text-neutral-400" />
              <p className="text-neutral-500">
                {query
                  ? `No boards match "${query}".`
                  : "No public boards yet. Publish one of yours to be the first."}
              </p>
            </div>
          ) : (
            <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
              {boards.map((item) => (
                <PinCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
