import {
  CalendarPlus,
  Check,
  Download,
  FileImage,
  FileText,
  Briefcase,
  Link2,
  Mail,
  MessageCircle,
  MessageSquare,
  Send,
  Share2,
  Shapes,
  X as XIcon,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useCallback, useState } from 'react';
import type { Editor } from '@tldraw/tldraw';
import { EmptyBoardError, exportPdf, exportPng, exportSvg } from './export-board';
import { SHARE_TARGETS, openShareTarget, type ShareContext } from './share-targets';
import { useAuthModal } from '@/lib/auth-modal-context';

const TARGET_ICONS: Record<string, ComponentType<{ size?: number }>> = {
  whatsapp: MessageCircle,
  telegram: Send,
  x: XIcon,
  reddit: Shapes,
  linkedin: Briefcase,
  gmail: Mail,
  sms: MessageSquare,
  calendar: CalendarPlus,
};

interface ShareTrayProps {
  editor: Editor | null;
  title: string;
  ownerName?: string;
  /** Canonical share URL. Defaults to the current address. */
  url?: string;
}

export function ShareTray({ editor, title, ownerName, url }: ShareTrayProps) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { requireAuth } = useAuthModal();

  const shareUrl = url ?? window.location.href;
  const ctx: ShareContext = { url: shareUrl, title, ownerName };

  const handleCopy = useCallback(async () => {
    requireAuth(
      async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      },
      {
        reason: 'collaborate',
        title: 'Save & Share Board',
        description: 'Log in to save this board so you can share a persistent link with others.',
      },
    );
  }, [shareUrl, requireAuth]);

  const executeExport = useCallback(
    async (kind: 'png' | 'svg' | 'pdf') => {
      if (!editor || busy) return;
      setBusy(kind);
      setError(null);
      try {
        if (kind === 'png') await exportPng(editor, title);
        else if (kind === 'svg') await exportSvg(editor, title);
        else await exportPdf(editor, title);
      } catch (e) {
        setError(
          e instanceof EmptyBoardError ? e.message : 'Export failed. Try again.',
        );
      } finally {
        setBusy(null);
      }
    },
    [editor, busy, title],
  );

  const runExport = useCallback(
    (kind: 'png' | 'svg' | 'pdf') => {
      requireAuth(() => executeExport(kind), {
        reason: 'export',
        title: 'Log in to export drawing',
        description: `Download your board as a high-resolution ${kind.toUpperCase()} file.`,
      });
    },
    [requireAuth, executeExport],
  );

  const handleShareTarget = useCallback(
    (target: (typeof SHARE_TARGETS)[number]) => {
      requireAuth(
        () => {
          openShareTarget(target, ctx);
        },
        {
          reason: 'collaborate',
          title: 'Save & Share Board',
          description: 'Log in to save this whiteboard so your share link is accessible.',
        },
      );
    },
    [requireAuth, ctx],
  );

  const rowClass =
    'flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40 dark:text-neutral-200 dark:hover:bg-neutral-800';
  const iconWrap = 'flex h-5 w-5 shrink-0 items-center justify-center';
  const labelClass = 'whitespace-nowrap';
  const headingClass =
    'flex items-center gap-3 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500';

  return (
    // Sits above tldraw's UI, which layers as high as z-index 99999.
    <div className="group fixed right-0 top-1/2 z-[100000] -translate-y-1/2">
      <div className="flex max-h-[80vh] flex-col overflow-hidden rounded-l-2xl border border-r-0 border-neutral-200 bg-white shadow-xl transition-[width] duration-300 ease-out dark:border-neutral-800 dark:bg-neutral-950 w-11 group-hover:w-60 group-focus-within:w-60">
        {/* Collapsed tab: just the handle. */}
        <div className="flex h-11 shrink-0 items-center gap-3 px-3 text-neutral-500 dark:text-neutral-400">
          <span className={iconWrap}>
            <Share2 size={16} />
          </span>
          <span className={`${labelClass} text-[11px] font-semibold uppercase tracking-wider`}>
            Share
          </span>
        </div>

        <div className="flex max-h-0 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 opacity-0 transition-all duration-300 ease-out group-hover:max-h-[70vh] group-hover:pb-2 group-hover:opacity-100 group-focus-within:max-h-[70vh] group-focus-within:pb-2 group-focus-within:opacity-100">
          <button type="button" onClick={() => void handleCopy()} className={rowClass}>
            <span className={iconWrap}>
              {copied ? <Check size={16} className="text-emerald-500" /> : <Link2 size={16} />}
            </span>
            <span className={labelClass}>{copied ? 'Link copied' : 'Copy link'}</span>
          </button>

          <div className="my-1 h-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
          <div className={headingClass}>
            <span className={iconWrap}>
              <Download size={16} />
            </span>
            <span className={labelClass}>Download</span>
          </div>

          <button
            type="button"
            onClick={() => runExport('png')}
            disabled={!editor || busy !== null}
            className={rowClass}
          >
            <span className={iconWrap}>
              <FileImage size={16} />
            </span>
            <span className={labelClass}>{busy === 'png' ? 'Exporting...' : 'PNG image'}</span>
          </button>

          <button
            type="button"
            onClick={() => runExport('svg')}
            disabled={!editor || busy !== null}
            className={rowClass}
          >
            <span className={iconWrap}>
              <Shapes size={16} />
            </span>
            <span className={labelClass}>{busy === 'svg' ? 'Exporting...' : 'SVG vector'}</span>
          </button>

          <button
            type="button"
            onClick={() => runExport('pdf')}
            disabled={!editor || busy !== null}
            className={rowClass}
          >
            <span className={iconWrap}>
              <FileText size={16} />
            </span>
            <span className={labelClass}>{busy === 'pdf' ? 'Exporting...' : 'PDF document'}</span>
          </button>

          <div className="my-1 h-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
          <div className={headingClass}>
            <span className={iconWrap}>
              <Send size={16} />
            </span>
            <span className={labelClass}>Send to</span>
          </div>

          {SHARE_TARGETS.map((target) => {
            const Icon = TARGET_ICONS[target.id] ?? Share2;
            return (
              <button
                key={target.id}
                type="button"
                onClick={() => handleShareTarget(target)}
                className={rowClass}
              >
                <span className={iconWrap}>
                  <Icon size={16} />
                </span>
                <span className={labelClass}>{target.label}</span>
              </button>
            );
          })}

          {error && <p className="px-2.5 pt-1 text-xs text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}
