/**
 * Share destinations that work purely through public URL schemes — no OAuth,
 * no API keys, no backend. Each builds a link we open in a new tab.
 */

export interface ShareContext {
  /** Canonical, publicly reachable URL for the board. */
  url: string;
  title: string;
  ownerName?: string;
}

function blurb({ title, ownerName }: ShareContext) {
  return ownerName
    ? `"${title}" by ${ownerName} — on Boared`
    : `"${title}" — on Boared`;
}

export interface ShareTarget {
  id: string;
  label: string;
  build: (ctx: ShareContext) => string;
}

export const SHARE_TARGETS: ShareTarget[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    build: (ctx) =>
      `https://wa.me/?text=${encodeURIComponent(`${blurb(ctx)} ${ctx.url}`)}`,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    build: (ctx) =>
      `https://t.me/share/url?url=${encodeURIComponent(ctx.url)}&text=${encodeURIComponent(blurb(ctx))}`,
  },
  {
    id: 'x',
    label: 'X',
    build: (ctx) =>
      `https://x.com/intent/tweet?url=${encodeURIComponent(ctx.url)}&text=${encodeURIComponent(blurb(ctx))}`,
  },
  {
    id: 'reddit',
    label: 'Reddit',
    build: (ctx) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(ctx.url)}&title=${encodeURIComponent(ctx.title)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    build: (ctx) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ctx.url)}`,
  },
  {
    id: 'gmail',
    label: 'Gmail',
    build: (ctx) =>
      `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(ctx.title)}&body=${encodeURIComponent(`${blurb(ctx)}\n\n${ctx.url}`)}`,
  },
  {
    id: 'sms',
    label: 'Message',
    build: (ctx) => `sms:?&body=${encodeURIComponent(`${blurb(ctx)} ${ctx.url}`)}`,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    build: (ctx) =>
      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Review: ${ctx.title}`)}&details=${encodeURIComponent(`${blurb(ctx)}\n\n${ctx.url}`)}`,
  },
];

export function openShareTarget(target: ShareTarget, ctx: ShareContext) {
  const href = target.build(ctx);
  // `sms:` must navigate in place; a popup for a protocol handler gets blocked.
  if (target.id === 'sms') {
    window.location.href = href;
    return;
  }
  window.open(href, '_blank', 'noopener,noreferrer');
}
