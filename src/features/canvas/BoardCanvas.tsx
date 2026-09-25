import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Tldraw,
  DefaultStylePanel,
  DefaultToolbar,
  type Editor,
  type TLEditorSnapshot,
} from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { Copy } from 'lucide-react';
import { updateBoardSnapshot } from '@/lib/boards-api';
import { useThemeStore } from '@/store/theme';
import { useBoardSync, type ActiveCollaborator } from './useBoardSync';
import { DocumentShapeUtil } from './documents/DocumentShapeUtil';
import { DocumentToolbar } from './documents/DocumentToolbar';
import { renderThumbnail } from './render-thumbnail';

const customShapeUtils = [DocumentShapeUtil];

/** Overrides the default right-side style panel to appear on the left instead. */
function LeftStylePanel() {
  return (
    <div className="pointer-events-auto absolute left-2 top-1/2 -translate-y-1/2 z-[400]">
      <DefaultStylePanel />
    </div>
  );
}

/** Places the Add Document button to the left of the bottom toolbar. */
function CustomToolbar(props: any) {
  return (
    <div className="flex items-end gap-2">
      <div className="pb-[calc(var(--tl-space-3)+var(--tl-sab))] pointer-events-auto">
        <DocumentToolbar />
      </div>
      <DefaultToolbar {...props} />
    </div>
  );
}

/** Hides the default style panel placeholder (we use LeftStylePanel above) and places Add Document button to the left of toolbar. */
const tldrawComponents = {
  StylePanel: LeftStylePanel,
  Toolbar: CustomToolbar,
} as const;

/** Read-only mode hides editing toolbars and panels */
const readOnlyComponents = {
  Toolbar: () => null,
  StylePanel: () => null,
} as const;

const AUTOSAVE_DEBOUNCE_MS = 1500;

interface BoardCanvasProps {
  boardId: string;
  initialSnapshot: Record<string, unknown>;
  /** Community view / read-only access — no autosave, no editing tools. */
  readOnly?: boolean;
  /** When true, board runs 100% in-memory without saving to server */
  isLocalMode?: boolean;
  /** Watermark attribution text for non-owner duplicates */
  watermarkText?: string | null;
  /** Hands the mounted editor up so siblings (share tray, imports) can drive it. */
  onEditorReady?: (editor: Editor) => void;
  /** Hands the list of currently active collaborators on the board up to the parent. */
  onActiveCollaboratorsChange?: (collaborators: ActiveCollaborator[]) => void;
}

function isEmptySnapshot(snapshot: Record<string, unknown>): boolean {
  return !snapshot || Object.keys(snapshot).length === 0;
}

export function BoardCanvas({
  boardId,
  initialSnapshot,
  readOnly = false,
  isLocalMode = false,
  watermarkText = null,
  onEditorReady,
  onActiveCollaboratorsChange,
}: BoardCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const saveTimeoutRef = useRef<number | undefined>(undefined);
  // tldraw keeps its own color-mode preference; without this it ignores our
  // `dark` class and stays light while the rest of the app flips.
  const theme = useThemeStore((s) => s.theme);

  const boardIdRef = useRef(boardId);
  boardIdRef.current = boardId;

  const isLocal = isLocalMode || boardId === 'local' || boardId === 'new';
  const isLocalRef = useRef(isLocal);
  isLocalRef.current = isLocal;

  const { activeCollaborators } = useBoardSync({
    boardId,
    editor,
    readOnly,
    enabled: !isLocal && !readOnly,
  });

  useEffect(() => {
    onActiveCollaboratorsChange?.(activeCollaborators);
  }, [activeCollaborators, onActiveCollaboratorsChange]);

  const handleMount = useCallback(
    (mountedEditor: Editor) => {
      setEditor(mountedEditor);
      onEditorReady?.(mountedEditor);

      if (readOnly) {
        mountedEditor.updateInstanceState({ isReadonly: true });
        return;
      }

      const unsubscribe = mountedEditor.store.listen(
        () => {
          if (isLocalRef.current) return;
          window.clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = window.setTimeout(() => {
            const currentBoardId = boardIdRef.current;
            if (
              isLocalRef.current ||
              currentBoardId === 'local' ||
              currentBoardId === 'new'
            ) {
              return;
            }
            const snapshot = mountedEditor.getSnapshot();
            void renderThumbnail(mountedEditor, watermarkText).then((thumbnail) =>
              updateBoardSnapshot(
                currentBoardId,
                snapshot as unknown as Record<string, unknown>,
                thumbnail,
              ),
            );
          }, AUTOSAVE_DEBOUNCE_MS);
        },
        { source: 'user', scope: 'document' },
      );

      return () => {
        window.clearTimeout(saveTimeoutRef.current);
        unsubscribe();
      };
    },
    [readOnly, watermarkText, onEditorReady],
  );

  return (
    <div className="relative h-full w-full">
      <Tldraw
        snapshot={
          isEmptySnapshot(initialSnapshot)
            ? undefined
            : (initialSnapshot as unknown as TLEditorSnapshot)
        }
        colorScheme={theme}
        shapeUtils={customShapeUtils}
        components={readOnly ? (readOnlyComponents as any) : (tldrawComponents as any)}
        onMount={handleMount}
        licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
      />

      {/* Attribution watermark for non-owner duplicates */}
      {watermarkText && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-[400] flex items-center gap-1.5 rounded-full border border-neutral-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-medium text-neutral-600 shadow-md backdrop-blur-xs dark:border-neutral-800/80 dark:bg-neutral-900/90 dark:text-neutral-300">
          <Copy size={12} className="text-brand" />
          <span>
            Duplicated from <strong>{watermarkText}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
