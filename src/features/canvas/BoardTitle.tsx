import { Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { renameBoard } from '@/lib/boards-api';

interface BoardTitleProps {
  boardId: string;
  title: string;
  onRenamed: (title: string) => void;
  canRename?: boolean;
}

/** Click-to-edit board name. Enter commits, Escape reverts, blur commits. */
export function BoardTitle({ boardId, title, onRenamed, canRename = true }: BoardTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  async function commit() {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === title) {
      setDraft(title);
      return;
    }
    if (boardId === 'local' || boardId === 'new' || !boardId) {
      onRenamed(next);
      return;
    }
    setSaving(true);
    try {
      const board = await renameBoard(boardId, next);
      onRenamed(board.title);
    } catch {
      setDraft(title);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        maxLength={255}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void commit();
          if (e.key === 'Escape') {
            setDraft(title);
            setEditing(false);
          }
        }}
        aria-label="Board name"
        className="w-56 rounded-md border border-brand bg-white px-2 py-1 text-sm font-medium text-neutral-900 focus:outline-none dark:bg-neutral-900 dark:text-neutral-50"
      />
    );
  }

  if (!canRename) {
    return (
      <span
        title={title}
        className="inline-flex max-w-[16rem] items-center rounded-md px-2 py-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50 truncate"
      >
        {title}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(title);
        setEditing(true);
      }}
      disabled={saving}
      title="Rename board"
      className="group inline-flex max-w-[16rem] items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200/70 disabled:opacity-50 dark:text-neutral-50 dark:hover:bg-neutral-800"
    >
      <span className="truncate">{saving ? 'Saving...' : title}</span>
      <Pencil
        size={12}
        className="shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100"
      />
    </button>
  );
}
