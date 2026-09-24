import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Tldraw,
  DefaultStylePanel,
  DefaultToolbar,
  type Editor,
  type TLEditorSnapshot,
} from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { updateBoardSnapshot } from '@/lib/boards-api';
import { useThemeStore } from '@/store/theme';
import { useBoardSync, type ActiveCollaborator } from './useBoardSync';
import { DocumentShapeUtil } from './documents/DocumentShapeUtil';
import { DocumentToolbar } from './documents/DocumentToolbar';

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

const AUTOSAVE_DEBOUNCE_MS = 1500;
/** Feed previews are displayed small; this keeps the data URL well under 100KB. */
const THUMBNAIL_WIDTH = 480;

/**
 * Renders a small preview of the board for the Pinterest-style feed. Returns
 * undefined for an empty board, and never rejects — a failed preview must not
 * take the snapshot save down with it.
 */
async function renderThumbnail(editor: Editor): Promise<string | undefined> {
  try {
    const ids = [...editor.getCurrentPageShapeIds()];
    if (ids.length === 0) return undefined;

    const bounds = editor.getCurrentPageBounds();
    const scale = bounds ? Math.min(1, THUMBNAIL_WIDTH / bounds.width) : 1;

    const { url } = await editor.toImageDataUrl(ids, {
      format: 'jpeg',
      quality: 0.7,
      background: true,
      darkMode: false,
      padding: 16,
      scale,
    });
    return url;
  } catch {
    return undefined;
  }
}

interface BoardCanvasProps {
  boardId: string;
  initialSnapshot: Record<string, unknown>;
  /** Community view of someone else's board — no autosave, no editing. */
  readOnly?: boolean;
  /** Hands the mounted editor up so siblings (share tray, imports) can drive it. */
  onEditorReady?: (editor: Editor) => void;
  /** Hands the list of currently active collaborators on the board up to the parent. */
  onActiveCollaboratorsChange?: (collaborators: ActiveCollaborator[]) => void;
}

function isEmptySnapshot(snapshot: Record<string, unknown>): boolean {
  return Object.keys(snapshot).length === 0;
}

export function BoardCanvas({
  boardId,
  initialSnapshot,
  readOnly = false,
  onEditorReady,
  onActiveCollaboratorsChange,
}: BoardCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const saveTimeoutRef = useRef<number | undefined>(undefined);
  // tldraw keeps its own color-mode preference; without this it ignores our
  // `dark` class and stays light while the rest of the app flips.
  const theme = useThemeStore((s) => s.theme);

  const { activeCollaborators } = useBoardSync({
    boardId,
    editor,
    readOnly,
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
          window.clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = window.setTimeout(() => {
            const snapshot = mountedEditor.getSnapshot();
            void renderThumbnail(mountedEditor).then((thumbnail) =>
              updateBoardSnapshot(
                boardId,
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
    [boardId, readOnly, onEditorReady],
  );

  return (
    <div className="h-full w-full">
      <Tldraw
        snapshot={
          isEmptySnapshot(initialSnapshot)
            ? undefined
            : (initialSnapshot as unknown as TLEditorSnapshot)
        }
        colorScheme={theme}
        shapeUtils={customShapeUtils}
        components={readOnly ? undefined : (tldrawComponents as any)}
        onMount={handleMount}
        licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
      />
    </div>
  );
}
