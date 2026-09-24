import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createBoard, deleteBoard, listBoards, listSharedBoards } from '@/lib/boards-api';
import { Avatar } from '@/components/Avatar';
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

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {boards.map((board) => (
            <li key={board.id} className="relative group">
              <Link
                to={`/boards/${board.id}`}
                className="group/card flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              >
                <Avatar name={board.title} />
                <div className="min-w-0 flex-1 pr-7">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-neutral-900 group-hover/card:text-brand dark:text-neutral-50">
                      {board.title}
                    </p>
                    {board.visibility === 'public' && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        Public
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    Updated {new Date(board.updatedAt).toLocaleString()}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={(e) => void handleDeleteBoard(e, board.id, board.title)}
                title="Delete board"
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 opacity-80 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 sm:opacity-0 dark:text-neutral-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>

        {sharedBoards.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              Shared with me
            </h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {sharedBoards.map((board) => (
                <li key={board.id}>
                  <Link
                    to={`/boards/${board.id}`}
                    className="group flex items-start gap-3 rounded-xl border border-brand/20 bg-brand/5 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md dark:bg-brand/10"
                  >
                    <Avatar name={board.title} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-neutral-900 group-hover:text-brand dark:text-neutral-50">
                          {board.title}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        Updated {new Date(board.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
}
