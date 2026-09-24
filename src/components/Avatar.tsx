const PALETTE = [
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-lime-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-pink-500',
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  /** When provided, renders an <img> instead of the coloured initials circle. */
  avatarUrl?: string | null;
}

export function Avatar({ name, size = 'md', avatarUrl }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const dims =
    size === 'sm'
      ? 'h-6 w-6 text-[10px]'
      : size === 'lg'
        ? 'h-16 w-16 text-2xl'
        : 'h-9 w-9 text-sm';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`inline-block shrink-0 rounded-full object-cover ${dims}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${colorFor(name)} ${dims}`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
