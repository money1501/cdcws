const PALETTE = [
  'from-rose-500 to-orange-500',
  'from-orange-500 to-amber-500',
  'from-amber-500 to-lime-500',
  'from-emerald-500 to-teal-500',
  'from-teal-500 to-cyan-500',
  'from-cyan-500 to-blue-500',
  'from-blue-500 to-indigo-500',
  'from-indigo-500 to-violet-500',
  'from-violet-500 to-fuchsia-500',
  'from-fuchsia-500 to-pink-500',
];

function gradientFor(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface CommunityAvatarProps {
  slug: string;
  iconUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const DIMS = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
} as const;

export function CommunityAvatar({
  slug,
  iconUrl,
  size = 'md',
  className,
}: CommunityAvatarProps) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={`d/${slug}`}
        className={`inline-block shrink-0 rounded-full object-cover ${DIMS[size]} ${className ?? ''}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ${gradientFor(slug)} ${DIMS[size]} ${className ?? ''}`}
    >
      {slug.charAt(0).toUpperCase()}
    </span>
  );
}

