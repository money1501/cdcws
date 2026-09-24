import { Plus, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CommunitySummary } from '@shared/community';
import { createCommunity, listCommunities } from '@/lib/communities-api';
import { CommunityCard } from '@/features/community/CommunityCard';
import { DrawgonLoader } from '@/components/DrawgonLoader';

export function CommunitiesPage() {
  const [items, setItems] = useState<CommunitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ slug: '', name: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setLoading(true);
      listCommunities(query.trim() || undefined)
        .then(setItems)
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const community = await createCommunity({
        slug: form.slug,
        name: form.name,
        description: form.description || undefined,
      });
      navigate(`/c/${community.slug}`);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })
          .response?.data?.message ?? 'Could not create community.';
      setError(Array.isArray(message) ? message.join(' ') : message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            Communities
          </h1>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover"
          >
            <Plus size={16} />
            New community
          </button>
        </div>

        {creating && (
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            {error && (
              <p className="mb-3 rounded-md bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-300">
                {error}
              </p>
            )}
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Handle
              </span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-neutral-400">d/</span>
                <input
                  required
                  value={form.slug}
                  onChange={(e) =>
                    setForm({ ...form, slug: e.target.value.toLowerCase() })
                  }
                  placeholder="filmmaking"
                  className={inputClass}
                />
              </div>
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Display name
              </span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Filmmaking"
                className={inputClass}
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Description <span className="text-neutral-400">(optional)</span>
              </span>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Storyboards, shot lists and set plans."
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create community'}
            </button>
          </form>
        )}

        <div className="relative mb-6">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search communities..."
            aria-label="Search communities"
            className={`${inputClass} pl-9`}
          />
        </div>

        {loading && <DrawgonLoader fullScreen={false} size={72} />}

        {!loading && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
            <p className="text-neutral-500">
              {query
                ? `No communities match "${query}".`
                : 'No communities yet. Create the first one.'}
            </p>
          </div>
        )}

        <ul className="space-y-3">
          {items.map((community) => (
            <li key={community.id}>
              <CommunityCard community={community} />
            </li>
          ))}
        </ul>
      </div>
  );
}
