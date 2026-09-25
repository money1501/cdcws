import { Bookmark } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { FeedItem } from '@shared/community';
import { listSavedBoards } from '@/lib/community-api';
import { useSession } from '@/lib/auth-client';
import { useAuthModal } from '@/lib/auth-modal-context';
import { PinCard } from '@/features/community/PinCard';
import { DrawgonLoader } from '@/components/DrawgonLoader';

export function SavedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, isPending: isAuthPending } = useSession();
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    if (isAuthPending) return;
    if (!session?.user) {
      setLoading(false);
      return;
    }

    listSavedBoards()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [session?.user, isAuthPending]);

  if (isAuthPending) {
    return <DrawgonLoader fullScreen={false} size={72} />;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        <Bookmark size={22} />
        Saved
      </h1>

      {loading && <DrawgonLoader fullScreen={false} size={72} />}

      {!loading && !session?.user && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-white/50 p-12 text-center dark:border-neutral-700 dark:bg-neutral-900/30">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand dark:bg-brand/20">
            <Bookmark size={28} />
          </div>
          <div className="max-w-md">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Save your favorite boards
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Log in or create a free account to bookmark public boards, organize inspiration, and access your saved collection anywhere.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openAuthModal({ reason: 'save', initialMode: 'login' })}
              className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
            >
              Log In / Sign Up
            </button>
            <Link
              to="/community"
              className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Explore community
            </Link>
          </div>
        </div>
      )}

      {!loading && session?.user && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 py-20 text-center dark:border-neutral-700">
          <Bookmark size={24} className="text-neutral-400" />
          <p className="text-neutral-500">Nothing saved yet.</p>
          <Link
            to="/community"
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover"
          >
            Explore canvases
          </Link>
        </div>
      )}

      {!loading && session?.user && items.length > 0 && (
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
          {items.map((item) => (
            <PinCard
              key={item.id}
              item={item}
              onDelete={(id) =>
                setItems((prev) => prev.filter((b) => b.id !== id))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

