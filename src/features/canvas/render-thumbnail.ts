import type { Editor } from '@tldraw/tldraw';

const THUMBNAIL_WIDTH = 480;

/**
 * Renders a small preview of the board for the Pinterest-style feed. Returns
 * undefined for an empty board, and never rejects — a failed preview must not
 * take the snapshot save down with it.
 */
export async function renderThumbnail(editor: Editor): Promise<string | undefined> {
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
