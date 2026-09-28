import type { HTMLAttributes } from 'react';

export interface CommunityLabelProps extends HTMLAttributes<HTMLSpanElement> {
  name?: string;
  slug?: string | null;
  community?: { name: string; slug: string } | null;
  showSlug?: boolean;
}

/**
 * Renders a community name with the "#slug" part visually de-emphasized.
 * - Name: unchanged (current size, weight, color inherited from parent).
 * - "#slug": same font size and weight, but faded (opacity 0.40) and brightens on hover (opacity 0.60).
 * - No space between name and "#slug", so it still reads and copies as Name#slug.
 */
export function CommunityLabel({
  name: rawName,
  slug: rawSlug,
  community,
  showSlug = true,
  className = '',
  ...rest
}: CommunityLabelProps) {
  const name = rawName ?? community?.name ?? '';
  const slug = rawSlug !== undefined ? rawSlug : (community?.slug ?? null);

  if (!slug || !showSlug) {
    return (
      <span className={`inline ${className}`.trim()} {...rest}>
        {name}
      </span>
    );
  }

  return (
    <span className={`inline group/community-label ${className}`.trim()} {...rest}>
      <span>{name}</span>
      <span className="opacity-40 transition-opacity duration-150 hover:opacity-60 group-hover:opacity-60 group-hover/community-label:opacity-60">
        #{slug}
      </span>
    </span>
  );
}
