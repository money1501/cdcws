import {
  Bell,
  Bookmark,
  Compass,
  Hash,
  LayoutGrid,
  LogOut,
  Plus,
  Settings,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import type { CommunitySummary } from '@shared/community';
import type { UserProfile } from '@shared/user';
import { listMyCommunities } from '@/lib/communities-api';
import { signOut, useSession } from '@/lib/auth-client';
import { getMyProfile, getFollowing } from '@/lib/users-api';
import { useNotifications } from '@/lib/notifications-context';
import { Avatar } from '@/components/Avatar';
import { CommunityAvatar } from '@/features/community/CommunityAvatar';
import { DrawgonMark } from '@/components/DrawgonMark';
import { ThemeToggle } from '@/components/ThemeToggle';

const PRIMARY_NAV = [
  { to: '/home', label: 'Home', icon: LayoutGrid, end: true },
  { to: '/community', label: 'Explore', icon: Compass, end: false },
  { to: '/saved', label: 'Saved', icon: Bookmark, end: false },
  { to: '/', label: 'My Boards', icon: LayoutGrid, end: true },
];

/**
 * Persistent sidebar + header. New screens render inside this; the older
 * full-page screens still carry their own headers until they are migrated.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();

  useEffect(() => {
    listMyCommunities()
      .then(setCommunities)
      .catch(() => setCommunities([]));
    getMyProfile()
      .then(setProfile)
      .catch(() => null);
      
    if (session?.user.id) {
      getFollowing(session.user.id)
        .then(setFollowing)
        .catch(() => setFollowing([]));
    }
  }, [session?.user.id]);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-brand/10 text-brand'
        : 'text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50'
    }`;

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex dark:border-neutral-800 dark:bg-neutral-900/50">
        <Link to="/home" className="flex items-center gap-2 px-4 py-4">
          <DrawgonMark size={26} />
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2">
          {PRIMARY_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={label} to={to} end={end} className={navClass}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          <div className="my-3 h-px bg-neutral-200 dark:bg-neutral-800" />

          <div className="flex items-center justify-between px-3 pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Communities
            </span>
            <Link
              to="/communities"
              title="Browse communities"
              className="text-neutral-400 transition hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              <Plus size={14} />
            </Link>
          </div>

          {communities.length === 0 && (
            <Link
              to="/communities"
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-brand"
            >
              Join your first community
            </Link>
          )}
          {communities.map((c) => (
            <NavLink key={c.id} to={`/c/${c.slug}`} className={navClass}>
              <CommunityAvatar slug={c.slug} size="sm" />
              <span className="truncate">d/{c.slug}</span>
            </NavLink>
          ))}

          {following.length > 0 && (
            <>
              <div className="my-3 h-px bg-neutral-200 dark:bg-neutral-800" />
              <div className="flex items-center justify-between px-3 pb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Following
                </span>
              </div>
              {following.map((f) => (
                <NavLink key={f.userId} to={`/users/${f.userId}`} className={navClass}>
                  <Avatar name={f.name || '?'} size="sm" avatarUrl={f.avatarUrl} />
                  <span className="truncate">{f.username ? `@${f.username}` : f.name}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-neutral-200 p-2 dark:border-neutral-800">
          <NavLink to="/profile" className={navClass}>
            <User size={16} />
            Profile
          </NavLink>
          <NavLink to="/settings" className={navClass}>
            <Settings size={16} />
            Settings
          </NavLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
          <Link to="/home" className="md:hidden">
            <DrawgonMark size={22} />
          </Link>

          <div className="flex flex-1 items-center justify-end gap-2">
            {/* Notifications bell */}
            <button
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
              aria-label="Notifications"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <ThemeToggle />
            <Link
              to="/profile"
              title={session?.user.email}
              className="rounded-full transition hover:opacity-80"
            >
              <Avatar
                name={session?.user.name || session?.user.email || '?'}
                size="sm"
                avatarUrl={profile?.avatarUrl}
              />
            </Link>
            <button
              type="button"
              onClick={() => void signOut({})}
              title="Sign out"
              aria-label="Sign out"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>

        {/* ── Notifications slide-over ── */}
        {notifOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-neutral-950/30 backdrop-blur-[1px]"
              onClick={() => setNotifOpen(false)}
            />
            {/* Panel */}
            <div className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3.5 dark:border-neutral-800">
                <h2 className="font-semibold text-neutral-900 dark:text-neutral-50">Notifications</h2>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="rounded-full px-2.5 py-1 text-xs text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <ul className="flex-1 divide-y divide-neutral-100 overflow-y-auto dark:divide-neutral-800">
                {notifications.length === 0 ? (
                  <li className="flex flex-col items-center gap-2 py-16 text-center">
                    <Bell size={24} className="text-neutral-300 dark:text-neutral-700" />
                    <p className="text-sm text-neutral-400">No notifications yet.</p>
                  </li>
                ) : (
                  notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          markRead(n.id);
                          if (n.link) { setNotifOpen(false); navigate(n.link); }
                        }}
                        className={`w-full px-4 py-3.5 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                          !n.read ? 'bg-brand/5 dark:bg-brand/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {!n.read && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                          )}
                          <div className={!n.read ? '' : 'pl-4'}>
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                              {n.title}
                            </p>
                            <p className="mt-0.5 text-xs text-neutral-500">{n.body}</p>
                            <p className="mt-1 text-[10px] text-neutral-400">
                              {new Date(n.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>
        )}

        {/* Mobile bottom navigation */}
        <nav className="flex shrink-0 items-center justify-around border-t border-neutral-200 bg-white py-1.5 md:hidden dark:border-neutral-800 dark:bg-neutral-900">
          {PRIMARY_NAV.slice(0, 3).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] text-neutral-500 dark:text-neutral-400"
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/communities"
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] text-neutral-500 dark:text-neutral-400"
          >
            <Hash size={18} />
            Communities
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
