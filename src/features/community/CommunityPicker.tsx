import { Check, ChevronDown, Hash } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CommunitySummary } from '@shared/community';
import { CommunityAvatar } from './CommunityAvatar';
import { listMyCommunities, setBoardCommunity } from '@/lib/communities-api';

interface CommunityPickerProps {
  boardId: string;
  communityId: string | null;
  onChange: (communityId: string | null) => void;
}

/** Files a board under one of the communities the user has joined. */
export function CommunityPicker({
  boardId,
  communityId,
  onChange,
}: CommunityPickerProps) {
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState<CommunitySummary[]>([]);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listMyCommunities().then(setMine).catch(() => setMine([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const current = mine.find((c) => c.id === communityId) ?? null;

  async function choose(slug: string | null) {
    if (pending) return;
    setPending(true);
    try {
      const board = await setBoardCommunity(boardId, slug);
      onChange(board.communityId);
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-200/70 hover:text-neutral-900 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
      >
        <Hash size={13} />
        {current ? `d/${current.slug}` : 'No community'}
        <ChevronDown size={13} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[100000] mt-1 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
          <button
            type="button"
            onClick={() => void choose(null)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            No community
            {communityId === null && <Check size={14} className="text-brand" />}
          </button>

          {mine.length === 0 && (
            <p className="px-3 py-2 text-xs text-neutral-400">
              Join a community to post boards to it.
            </p>
          )}

          {mine.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void choose(c.slug)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <div className="flex items-center gap-2 truncate">
                <CommunityAvatar slug={c.slug} iconUrl={c.iconUrl} size="sm" />
                <span className="truncate">d/{c.slug}</span>
              </div>
              {communityId === c.id && <Check size={14} className="text-brand shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
