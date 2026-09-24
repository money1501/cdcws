import { Check, Link2, Loader2, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '@/lib/auth-client';
import {
  getPublicProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from '@/lib/users-api';
import type { FollowSummary, PublicUserProfile } from '@shared/user';
import { Avatar } from '@/components/Avatar';
import { DrawgonLoader } from '@/components/DrawgonLoader';
import { useToast } from '@/components/toast/ToastProvider';

type FollowModal = 'followers' | 'following' | null;

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: session } = useSession();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState<FollowSummary[]>([]);
  const [followingList, setFollowingList] = useState<FollowSummary[]>([]);
  const [followModal, setFollowModal] = useState<FollowModal>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getPublicProfile(userId)
      .then((p) => {
        setProfile(p);
        // load follower lists
        getFollowers(userId).then(setFollowers).catch(() => setFollowers([]));
        getFollowing(userId).then(setFollowingList).catch(() => setFollowingList([]));
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [userId]);

  const isMe = session?.user.id === userId;

  async function toggleFollow() {
    if (!userId || isMe || following) return;
    setFollowing(true);
    try {
      if (profile?.isFollowedByMe) {
        await unfollowUser(userId);
        setProfile((prev) =>
          prev
            ? { ...prev, isFollowedByMe: false, followersCount: prev.followersCount - 1 }
            : prev,
        );
        setFollowers((prev) => prev.filter((f) => f.userId !== session?.user.id));
        toast.success('Unfollowed');
      } else {
        await followUser(userId);
        setProfile((prev) =>
          prev
            ? { ...prev, isFollowedByMe: true, followersCount: prev.followersCount + 1 }
            : prev,
        );
        toast.success('Followed');
      }
    } catch {
      toast.error('Failed to update follow status');
    } finally {
      setFollowing(false);
    }
  }

  function handleShare() {
    if (!userId) return;
    const url = `${window.location.origin}/users/${userId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Profile link copied!');
    });
  }

  if (loading) return <DrawgonLoader fullScreen={false} size={72} />;
  if (!profile) {
    return (
      <div className="py-16 text-center text-neutral-500">
        User not found.
      </div>
    );
  }

  const name = profile.name || '?';

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* ── Profile Card ── */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar name={name} avatarUrl={profile.avatarUrl} size="lg" />

          <div className="min-w-0 flex-1">
            {/* Name + username + actions */}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                {name}
              </h1>
              {profile.username && (
                <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-sm font-medium text-brand">
                  @{profile.username}
                </span>
              )}

              <div className="ml-auto flex items-center gap-2">
                {/* Share */}
                <button
                  type="button"
                  onClick={handleShare}
                  title="Copy profile link"
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                >
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Link2 size={12} />}
                  {copied ? 'Copied!' : 'Share'}
                </button>

                {/* Follow / Unfollow */}
                {!isMe && session && (
                  <button
                    type="button"
                    onClick={() => void toggleFollow()}
                    disabled={following}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                      profile.isFollowedByMe
                        ? 'border border-neutral-200 bg-transparent text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800'
                        : 'bg-brand text-white hover:bg-brand-hover'
                    }`}
                  >
                    {following ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Users size={13} />
                    )}
                    {profile.isFollowedByMe ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                {profile.bio}
              </p>
            )}

            {/* Stats */}
            <dl className="mt-5 flex flex-wrap gap-6 border-t border-neutral-100 pt-4 text-sm dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setFollowModal('followers')}
                className="text-left transition hover:opacity-70"
              >
                <dt className="text-neutral-400">Followers</dt>
                <dd className="font-semibold text-neutral-900 dark:text-neutral-50">
                  {profile.followersCount}
                </dd>
              </button>
              <button
                type="button"
                onClick={() => setFollowModal('following')}
                className="text-left transition hover:opacity-70"
              >
                <dt className="text-neutral-400">Following</dt>
                <dd className="font-semibold text-neutral-900 dark:text-neutral-50">
                  {profile.followingCount}
                </dd>
              </button>
            </dl>
          </div>
        </div>
      </div>

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
                  Followers ({profile.followersCount})
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
                  Following ({profile.followingCount})
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
