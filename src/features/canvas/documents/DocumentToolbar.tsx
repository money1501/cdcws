import { useState, useRef, useEffect } from 'react';
import { useEditor, createShapeId } from '@tldraw/tldraw';
import {
  FileText,
  Code,
  Table,
  FileQuestion,
  Presentation,
  Plus,
  ChevronDown,
} from 'lucide-react';
import type { DocumentType } from './DocumentBlockTypes';
import {
  DEFAULT_TEXT_CONTENT,
  DEFAULT_CODE_CONTENT,
  DEFAULT_SPREADSHEET_CELLS,
  DEFAULT_SLIDES,
} from './DocumentBlockTypes';

interface DocumentToolbarProps {
  readOnly?: boolean;
}

const DOCUMENT_ITEMS = [
  {
    type: 'text' as DocumentType,
    label: 'Text Editor',
    desc: 'Rich notes, markdown & checklists',
    icon: FileText,
    iconColor: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20',
    w: 500,
    h: 360,
    title: 'Untitled Notes',
    content: DEFAULT_TEXT_CONTENT,
    meta: {},
  },
  {
    type: 'code' as DocumentType,
    label: 'Code Editor',
    desc: 'Syntax highlighting & live console runner',
    icon: Code,
    iconColor: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20',
    w: 560,
    h: 400,
    title: 'Untitled Script',
    content: DEFAULT_CODE_CONTENT,
    meta: { language: 'typescript' },
  },
  {
    type: 'sheet' as DocumentType,
    label: 'Spreadsheet',
    desc: 'Grid with formulas (=SUM, =AVG) & CSV export',
    icon: Table,
    iconColor: 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/20',
    w: 600,
    h: 380,
    title: 'Untitled Sheet',
    content: JSON.stringify(DEFAULT_SPREADSHEET_CELLS),
    meta: { rows: 8, cols: 5 },
  },
  {
    type: 'pdf' as DocumentType,
    label: 'PDF Document',
    desc: 'Embedded interactive reader with zoom & pages',
    icon: FileQuestion,
    iconColor: 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20',
    w: 520,
    h: 480,
    title: 'Untitled PDF',
    content: '',
    meta: { page: 1, zoom: 1 },
  },
  {
    type: 'slides' as DocumentType,
    label: 'Slideshow Deck',
    desc: 'Interactive slides with presentation mode',
    icon: Presentation,
    iconColor: 'text-purple-500 bg-purple-500/10 dark:bg-purple-500/20',
    w: 640,
    h: 420,
    title: 'Untitled Presentation',
    content: JSON.stringify(DEFAULT_SLIDES),
    meta: { currentSlide: 0 },
  },
];

function getRandomJitter(): { jitterX: number; jitterY: number } {
  return {
    jitterX: (Math.random() - 0.5) * 60,
    jitterY: (Math.random() - 0.5) * 60,
  };
}

export function DocumentToolbar({ readOnly = false }: DocumentToolbarProps) {
  const editor = useEditor();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  if (readOnly || editor.getInstanceState().isReadonly) return null;

  const handleCreateDocument = (item: (typeof DOCUMENT_ITEMS)[number]) => {
    setOpen(false);
    const bounds = editor.getViewportPageBounds();
    const center = bounds.center;

    // Slight random offset so multiple newly created blocks don't stack exactly over each other
    const { jitterX, jitterY } = getRandomJitter();

    const shapeId = createShapeId();
    editor.createShape({
      id: shapeId,
      type: 'document_block',
      x: center.x - item.w / 2 + jitterX,
      y: center.y - item.h / 2 + jitterY,
      props: {
        w: item.w,
        h: item.h,
        docType: item.type,
        title: item.title,
        content: item.content,
        meta: item.meta,
      },
    } as any);

    editor.select(shapeId);
  };

  return (
    <div
      ref={menuRef}
      className="pointer-events-auto relative select-none"
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Add an interactive document block to the whiteboard"
        className="inline-flex h-[48px] items-center gap-2 rounded-xl border border-neutral-200/90 bg-white/95 px-3.5 text-xs font-semibold text-neutral-800 shadow-md backdrop-blur-md transition-all hover:bg-neutral-100 hover:shadow-lg dark:border-neutral-700/80 dark:bg-neutral-900/95 dark:text-neutral-100 dark:hover:bg-neutral-800"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-brand text-white shadow-xs">
          <Plus size={13} strokeWidth={2.5} />
        </span>
        <span>Add Document</span>
        <ChevronDown
          size={13}
          className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popover Palette — opens upward above button */}
      {open && (
        <div className="absolute bottom-[calc(100%+8px)] left-0 z-[500] w-72 rounded-2xl border border-neutral-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 dark:border-neutral-800 dark:bg-neutral-950/95">
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Document Blocks
          </div>

          <div className="space-y-0.5">
            {DOCUMENT_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleCreateDocument(item)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-neutral-100 dark:hover:bg-neutral-900 group"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.iconColor} transition group-hover:scale-105`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {item.label}
                    </p>
                    <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-1.5 border-t border-neutral-100 px-2.5 py-1 text-[10px] text-neutral-400 dark:border-neutral-800/80 dark:text-neutral-500">
            Stays on whiteboard &amp; syncs live
          </div>
        </div>
      )}
    </div>
  );
}
