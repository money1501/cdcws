import type { Editor } from '@tldraw/tldraw';

const THUMBNAIL_WIDTH = 480;

/**
 * Renders a small preview of the board for the Pinterest-style feed. Returns
 * undefined for an empty board, and never rejects — a failed preview must not
 * take the snapshot save down with it.
 * If watermarkText is provided (e.g. for duplicated boards), bakes a visible attribution into the thumbnail.
 */
export async function renderThumbnail(
  editor: Editor,
  watermarkText?: string | null,
): Promise<string | undefined> {
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

    if (!watermarkText) {
      return url;
    }

    // Apply watermark on top of thumbnail image
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(url);
          return;
        }

        ctx.drawImage(img, 0, 0);

        // Watermark pill in bottom-left
        const label = `Duplicated from ${watermarkText}`;
        ctx.font = '600 11px system-ui, -apple-system, sans-serif';
        const textWidth = ctx.measureText(label).width;
        const padX = 8;
        const pillWidth = textWidth + padX * 2;
        const pillHeight = 20;
        const x = 12;
        const y = img.height - pillHeight - 12;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, pillWidth, pillHeight, 10);
        } else {
          ctx.rect(x, y, pillWidth, pillHeight);
        }
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + padX, y + pillHeight / 2);

        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  } catch {
    return undefined;
  }
}
