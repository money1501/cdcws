import { Monitor, Moon, Palette, Shield, Sun, User } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { useThemeStore } from '@/store/theme';
import { Avatar } from '@/components/Avatar';

const THEMES = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
];

export function SettingsPage() {
  const { data: session } = useSession();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const card =
    'rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';
  const heading =
    'mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-400';

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        Settings
      </h1>

      <section className={`${card} mb-4`}>
        <h2 className={heading}>
          <User size={14} />
          Account
        </h2>
        <div className="flex items-center gap-3">
          <Avatar name={session?.user.name || session?.user.email || '?'} />
          <div className="min-w-0">
            <p className="truncate font-medium text-neutral-900 dark:text-neutral-50">
              {session?.user.name || 'Unnamed'}
            </p>
            <p className="truncate text-sm text-neutral-500">{session?.user.email}</p>
          </div>
        </div>
      </section>

      <section className={`${card} mb-4`}>
        <h2 className={heading}>
          <Palette size={14} />
          Appearance
        </h2>
        <div className="flex gap-2">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                if (theme !== value) toggleTheme();
              }}
              aria-pressed={theme === value}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition ${
                theme === value
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-400">
          <Monitor size={12} />
          Your choice is saved to this browser and overrides the system setting.
        </p>
      </section>

      <section className={card}>
        <h2 className={heading}>
          <Shield size={14} />
          Privacy &amp; security
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Password changes, active sessions, two-factor authentication and data
          export are not built yet.
        </p>
      </section>
    </div>
  );
}
