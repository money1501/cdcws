import {
  Bookmark,
  Camera,
  Check,
  Edit3,
  Grid3x3,
  Link2,
  Loader2,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { BoardSummary } from '@shared/board';
import type { FeedItem } from '@shared/community';
import type { FollowSummary, UserProfile } from '@shared/user';
import { listBoards } from '@/lib/boards-api';
import { listSavedBoards } from '@/lib/community-api';
import { useSession } from '@/lib/auth-client';
import { getMyProfile, updateMyProfile, getFollowers, getFollowing } from '@/lib/users-api';
import { Avatar } from '@/components/Avatar';
import { PinCard } from '@/features/community/PinCard';
import { DrawgonLoader } from '@/components/DrawgonLoader';
import { useToast } from '@/components/toast/ToastProvider';

type Tab = 'creations' | 'saved';
type FollowModal = 'followers' | 'following' | null;

export function ProfilePage() {
  const { data: session } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  // Data state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState<Tab>('creations');
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [saved, setSaved] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState<FollowSummary[]>([]);
  const [followingList, setFollowingList] = useState<FollowSummary[]>([]);
  const [followModal, setFollowModal] = useState<FollowModal>(null);
  const [copied, setCopied] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: '', bio: '', avatarUrl: '' });

  useEffect(() => {
    Promise.all([listBoards(), listSavedBoards(), getMyProfile()])
      .then(([mine, savedItems, prof]) => {
        setBoards(mine);
        setSaved(savedItems);
        setProfile(prof);
        setForm({
          username: prof.username ?? '',
          bio: prof.bio ?? '',
          avatarUrl: prof.avatarUrl ?? '',
        });
        // Load followers/following
        if (session?.user.id) {
          getFollowers(session.user.id).then(setFollowers).catch(() => setFollowers([]));
          getFollowing(session.user.id).then(setFollowingList).catch(() => setFollowingList([]));
        }
      })
      .finally(() => setLoading(false));
  }, [session?.user.id]);

  const publicCount = boards.filter((b) => b.visibility === 'public').length;
  const name = session?.user.name || session?.user.email || '?';

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm((f) => ({ ...f, avatarUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        username: form.username.trim() || undefined,
        bio: form.bio.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
      });
      setProfile(updated);
      setEditing(false);
      toast.success('Profile saved');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Could not save profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm({
      username: profile?.username ?? '',
      bio: profile?.bio ?? '',
      avatarUrl: profile?.avatarUrl ?? '',
    });
    setEditing(false);
  }

  function handleShare() {
    if (!session?.user.id) return;
    const url = `${window.location.origin}/users/${session.user.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Profile link copied!');
    });
  }

  const tabClass = (t: Tab) =>
    `inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
      tab === t
        ? 'border-brand text-brand'
        : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
    }`;

  if (loading) return <DrawgonLoader fullScreen={false} size={72} />;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* ── Profile Header ── */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {/* Gradient accent */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar
              name={name}
              avatarUrl={editing ? form.avatarUrl || null : profile?.avatarUrl}
              size="lg"
            />
            {editing && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  title="Change avatar"
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white shadow-md transition hover:bg-brand-hover"
                >
                  <Camera size={12} />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
              </>
            )}
          </div>

          {/* Info / Edit form */}
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-3">
                {/* Username */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Username
                  </label>
                  <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                    <span className="text-neutral-400">@</span>
                    <input
                      id="profile-username"
                      type="text"
                      maxLength={40}
                      value={form.username}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, username: e.target.value }))
                      }
                      placeholder="yourhandle"
                      className="flex-1 bg-transparent text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-50"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Bio
                  </label>
                  <textarea
                    id="profile-bio"
                    rows={3}
                    maxLength={300}
                    value={form.bio}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bio: e.target.value }))
                    }
                    placeholder="Tell the world a bit about yourself…"
                    className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                  />
                </div>

                {/* Avatar URL fallback */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Avatar URL{' '}
                    <span className="font-normal text-neutral-400">
                      (or upload above)
                    </span>
                  </label>
                  <input
                    id="profile-avatar-url"
                    type="text"
                    value={
                      form.avatarUrl.startsWith('data:')
                        ? '(image uploaded)'
                        : form.avatarUrl
                    }
                    readOnly={form.avatarUrl.startsWith('data:')}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, avatarUrl: e.target.value }))
                    }
                    placeholder="https://…"
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                    {session?.user.name || 'Unnamed'}
                  </h1>
                  {profile?.username && (
                    <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-sm font-medium text-brand">
                      @{profile.username}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleShare}
                      title="Copy profile link"
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      {copied ? <Check size={12} className="text-emerald-500" /> : <Link2 size={12} />}
                      {copied ? 'Copied!' : 'Share'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      <Edit3 size={12} />
                      Edit profile
                    </button>
                  </div>
                </div>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {session?.user.email}
                </p>
                {profile?.bio && (
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                    {profile.bio}
                  </p>
                )}
                {!profile?.bio && (
                  <p className="mt-2 text-sm italic text-neutral-400">
                    No bio yet —{' '}
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="text-brand hover:underline"
                    >
                      add one
                    </button>
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stats row */}
        {!editing && (
          <dl className="relative mt-5 flex flex-wrap gap-6 border-t border-neutral-100 pt-4 text-sm dark:border-neutral-800">
            <div>
              <dt className="text-neutral-400">Canvases</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-50">
                {boards.length}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">Published</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-50">
                {publicCount}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">Saved</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-50">
                {saved.length}
              </dd>
            </div>
            <button
              type="button"
              onClick={() => setFollowModal('followers')}
              className="text-left transition hover:opacity-70"
            >
              <dt className="text-neutral-400">Followers</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-50">
                {followers.length}
              </dd>
            </button>
            <button
              type="button"
              onClick={() => setFollowModal('following')}
              className="text-left transition hover:opacity-70"
            >
              <dt className="text-neutral-400">Following</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-50">
                {followingList.length}
              </dd>
            </button>
          </dl>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => setTab('creations')}
          className={tabClass('creations')}
        >
          <Grid3x3 size={15} />
          Creations
        </button>
        <button
          type="button"
          onClick={() => setTab('saved')}
          className={tabClass('saved')}
        >
          <Bookmark size={15} />
          Saved
        </button>
      </div>

      {/* ── Tab content ── */}
      {tab === 'creations' &&
        (boards.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-neutral-500">No canvases yet.</p>
            <p className="mt-1 text-xs text-neutral-400">
              Create one from the dashboard!
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {boards.map((board) => (
              <li key={board.id}>
                <Link
                  to={`/boards/${board.id}`}
                  className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
                >
                  {board.thumbnailUrl ? (
                    <img
                      src={board.thumbnailUrl}
                      alt=""
                      className="h-28 w-full object-cover object-top"
                    />
                  ) : (
                    <div className="h-28 bg-gradient-to-br from-violet-500/10 to-cyan-500/10" />
                  )}
                  <div className="flex items-center justify-between gap-2 p-3">
                    <p className="truncate text-sm font-medium text-neutral-900 group-hover:text-brand dark:text-neutral-50">
                      {board.title}
                    </p>
                    {board.visibility === 'public' && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        Public
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'saved' &&
        (saved.length === 0 ? (
          <p className="py-16 text-center text-neutral-500">
            Nothing saved yet.
          </p>
        ) : (
          <div className="mt-6 columns-2 gap-4 sm:columns-3 lg:columns-4">
            {saved.map((item) => (
              <PinCard key={item.id} item={item} />
            ))}
          </div>
        ))}

      {/* ── Followers / Following Modal ── */}
      {followModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-sm"
          onClick={() => setFollowModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setFollowModal('followers')}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    followModal === 'followers'
                      ? 'bg-brand/10 text-brand'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  <Users size={13} className="mr-1 inline" />
                  Followers ({followers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFollowModal('following')}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    followModal === 'following'
                      ? 'bg-brand/10 text-brand'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  Following ({followingList.length})
                </button>
              </div>
              <button
                type="button"
                onClick={() => setFollowModal(null)}
                className="rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>
            <ul className="max-h-80 divide-y divide-neutral-100 overflow-y-auto dark:divide-neutral-800">
              {(followModal === 'followers' ? followers : followingList).length === 0 ? (
                <li className="py-10 text-center text-sm text-neutral-400">
                  {followModal === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                </li>
              ) : (
                (followModal === 'followers' ? followers : followingList).map((u) => (
                  <li key={u.userId}>
                    <button
                      type="button"
                      onClick={() => { setFollowModal(null); navigate(`/users/${u.userId}`); }}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <Avatar name={u.name || '?'} avatarUrl={u.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                          {u.name || 'Unknown'}
                        </p>
                        {u.username && (
                          <p className="truncate text-xs text-neutral-500">@{u.username}</p>
                        )}
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
