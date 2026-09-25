import { Copy, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createBoard, deleteBoard, duplicateBoard, listBoards, listSharedBoards } from '@/lib/boards-api';
import { DrawgonLoader } from '@/components/DrawgonLoader';
import { useToast } from '@/components/toast/ToastProvider';
import type { BoardSummary } from '@shared/board';

export function DashboardPage() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [sharedBoards, setSharedBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    Promise.all([listBoards(), listSharedBoards()])
      .then(([myBoards, shared]) => {
        setBoards(myBoards);
        setSharedBoards(shared);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const board = await createBoard({ title: 'Untitled board' });
      navigate(`/boards/${board.id}`);
    } catch {
      toast.error('Could not create board. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDuplicateBoard(e: React.MouseEvent, boardId: string) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const copy = await duplicateBoard(boardId);
      toast.success('Copy created! Opening whiteboard...');
      navigate(`/boards/${copy.id}`);
    } catch {
      toast.error('Could not create copy of board.');
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
      toast.error('Could not delete board.');
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            My Boards
          </h1>
          <button
            onClick={() => void handleCreate()}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
          >
            <Plus size={16} />
            {creating ? 'Creating...' : 'New board'}
          </button>
        </div>

        {loading && <DrawgonLoader fullScreen={false} size={72} />}

        {!loading && boards.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
            <Sparkles size={22} className="text-neutral-400" />
            <p className="text-neutral-500">No boards yet. Create one to start drawing.</p>
          </div>
        )}

        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
          {boards.map((board) => (
            <div key={board.id} className="group mb-4 block break-inside-avoid">
              <div className="relative overflow-hidden rounded-2xl bg-neutral-100 shadow-sm transition duration-200 hover:shadow-md dark:bg-neutral-900">
                <Link to={`/boards/${board.id}`} className="block">
                  {board.thumbnailUrl ? (
                    <img
                      src={board.thumbnailUrl}
                      alt={board.title}
                      loading="lazy"
                      className="max-h-[420px] w-full object-cover object-top transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex aspect-4/3 items-center justify-center bg-gradient-to-br from-violet-500/15 via-brand/10 to-cyan-500/15 p-4">
                      <span className="text-center text-sm font-medium text-neutral-600 dark:text-neutral-400 line-clamp-3">
                        {board.title}
                      </span>
                    </div>
                  )}
                </Link>

                {/* Hover scrim */}
                <div className="pointer-events-none absolute inset-0 bg-neutral-950/0 transition group-hover:bg-neutral-950/30" />

                {/* Top-left visibility badge */}
                <div className="absolute left-2.5 top-2.5 pointer-events-none">
                  {board.visibility === 'public' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm backdrop-blur-xs">
                      Public
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-900/70 px-2 py-0.5 text-[11px] font-medium text-neutral-200 shadow-sm backdrop-blur-xs">
                      Private
                    </span>
                  )}
                </div>

                {/* Top-right action buttons */}
                <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => void handleDuplicateBoard(e, board.id)}
                    title="Make a copy"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-brand dark:bg-neutral-900/95 dark:text-neutral-200 dark:hover:text-brand"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => void handleDeleteBoard(e, board.id, board.title)}
                    title="Delete board"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-md backdrop-blur-sm transition hover:bg-red-50 hover:text-red-600 dark:bg-neutral-900/95 dark:text-neutral-200 dark:hover:bg-red-950/60 dark:hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Card details below thumbnail */}
              <div className="mt-2 px-1">
                <Link to={`/boards/${board.id}`} className="group-hover:text-brand">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50 transition group-hover:text-brand">
                    {board.title}
                  </p>
                </Link>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  Updated {new Date(board.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {sharedBoards.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              Shared with me
            </h2>
            <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
              {sharedBoards.map((board) => (
                <div key={board.id} className="group mb-4 block break-inside-avoid">
                  <div className="relative overflow-hidden rounded-2xl bg-neutral-100 shadow-sm transition duration-200 hover:shadow-md dark:bg-neutral-900">
                    <Link to={`/boards/${board.id}`} className="block">
                      {board.thumbnailUrl ? (
                        <img
                          src={board.thumbnailUrl}
                          alt={board.title}
                          loading="lazy"
                          className="max-h-[420px] w-full object-cover object-top transition duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex aspect-4/3 items-center justify-center bg-gradient-to-br from-violet-500/15 via-brand/10 to-cyan-500/15 p-4">
                          <span className="text-center text-sm font-medium text-neutral-600 dark:text-neutral-400 line-clamp-3">
                            {board.title}
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* Hover scrim */}
                    <div className="pointer-events-none absolute inset-0 bg-neutral-950/0 transition group-hover:bg-neutral-950/30" />

                    {/* Top-right action buttons */}
                    <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => void handleDuplicateBoard(e, board.id)}
                        title="Make a copy"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-brand dark:bg-neutral-900/95 dark:text-neutral-200 dark:hover:text-brand"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Card details below thumbnail */}
                  <div className="mt-2 px-1">
                    <Link to={`/boards/${board.id}`} className="group-hover:text-brand">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50 transition group-hover:text-brand">
                        {board.title}
                      </p>
                    </Link>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      Updated {new Date(board.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
