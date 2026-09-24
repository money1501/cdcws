import { Compass, FileText, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { BoardSummary } from '@shared/board';
import type { FeedItem } from '@shared/community';
import { createBoard, deleteBoard, listBoards, listSharedBoards } from '@/lib/boards-api';
import { listCommunityFeed } from '@/lib/community-api';
import { useSession } from '@/lib/auth-client';
import { PinCard } from '@/features/community/PinCard';
import { DrawgonLoader } from '@/components/DrawgonLoader';
import { useToast } from '@/components/toast/ToastProvider';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomePage() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [sharedBoards, setSharedBoards] = useState<BoardSummary[]>([]);
  const [trending, setTrending] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { data: session } = useSession();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    Promise.all([listBoards(), listSharedBoards(), listCommunityFeed()])
      .then(([mine, shared, feed]) => {
        setBoards(mine.slice(0, 4));
        setSharedBoards(shared);
        setTrending([...feed].sort((a, b) => b.score - a.score).slice(0, 12));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const board = await createBoard({ title: 'Untitled board' });
      navigate(`/boards/${board.id}`);
    } catch {
      toast.error('Could not create canvas');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteBoard(e: React.MouseEvent, boardId: string, title: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await deleteBoard(boardId);
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
      toast.success('Board deleted');
    } catch {
      toast.error('Could not delete board');
    }
  }

  const firstName = (session?.user.name || session?.user.email || '').split(/[\s@]/)[0];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        {greeting()}
        {firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Pick up where you left off, or find something new.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          <Plus size={16} />
          New canvas
        </button>
        <Link
          to="/community"
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <Compass size={16} />
          Explore
        </Link>
        <Link
          to="/communities"
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <Sparkles size={16} />
          Communities
        </Link>
      </div>

      {loading && <DrawgonLoader fullScreen={false} size={72} />}

      {!loading && boards.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Continue creating
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {boards.map((board) => (
              <li key={board.id} className="relative group">
                <Link
                  to={`/boards/${board.id}`}
                  className="group/card block overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
                >
                  {board.thumbnailUrl ? (
                    <img
                      src={board.thumbnailUrl}
                      alt=""
                      className="h-28 w-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center bg-gradient-to-br from-violet-500/10 to-cyan-500/10">
                      <FileText size={20} className="text-neutral-400" />
                    </div>
                  )}
                  <div className="p-3 pr-8">
                    <p className="truncate text-sm font-medium text-neutral-900 group-hover/card:text-brand dark:text-neutral-50">
                      {board.title}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {new Date(board.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={(e) => void handleDeleteBoard(e, board.id, board.title)}
                  title="Delete board"
                  className="absolute right-2 bottom-2.5 inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 opacity-80 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 sm:opacity-0 dark:text-neutral-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && trending.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Trending
          </h2>
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
            {trending.map((item) => (
              <PinCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {!loading && sharedBoards.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            <Users size={13} />
            Shared with me
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sharedBoards.map((board) => (
              <li key={board.id}>
                <Link
                  to={`/boards/${board.id}`}
                  className="group block overflow-hidden rounded-xl border border-brand/20 bg-brand/5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-brand/10"
                >
                  {board.thumbnailUrl ? (
                    <img src={board.thumbnailUrl} alt="" className="h-28 w-full object-cover object-top" />
                  ) : (
                    <div className="flex h-28 items-center justify-center bg-gradient-to-br from-violet-500/10 to-cyan-500/10">
                      <Users size={20} className="text-neutral-400" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-neutral-900 group-hover:text-brand dark:text-neutral-50">
                      {board.title}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {new Date(board.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && boards.length === 0 && trending.length === 0 && sharedBoards.length === 0 && (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 py-20 text-center dark:border-neutral-700">
          <Sparkles size={24} className="text-neutral-400" />
          <p className="text-neutral-500">Nothing here yet. Create your first canvas.</p>
        </div>
      )}
    </div>
  );
}
