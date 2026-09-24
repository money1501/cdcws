import {
  AssetRecordType,
  createShapeId,
  type Editor,
  type TLAssetId,
  type TLImageShape,
} from '@tldraw/tldraw';

/** Rendering scale — 2x keeps page text legible when zoomed in on canvas. */
const RENDER_SCALE = 2;
/** Guard against someone dropping a 400-page book onto a whiteboard. */
export const MAX_PDF_PAGES = 30;
const PAGE_GAP = 32;

export class PdfImportError extends Error {}

/**
 * pdf.js ships its worker as a separate chunk. Importing it lazily keeps
 * ~1MB of PDF machinery out of the main bundle until someone imports a PDF.
 */
export async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

async function pageToDataUrl(
  page: { getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: never) => { promise: Promise<void> } },
): Promise<{ url: string; width: number; height: number }> {
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const context = canvas.getContext('2d');
  if (!context) throw new PdfImportError('Could not get a 2D canvas context.');

  await page.render({ canvasContext: context, viewport } as never).promise;
  // JPEG, not PNG: pages get embedded in the board snapshot as data URLs, and
  // a PNG page is roughly ten times the size for no visible gain on scanned
  // or text content.
  return {
    url: canvas.toDataURL('image/jpeg', 0.82),
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Renders each page of a PDF and drops them onto the canvas as image shapes,
 * stacked vertically and selected when done.
 */
export async function importPdfToCanvas(
  editor: Editor,
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const pdfjs = await loadPdfJs();
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;

  const total = Math.min(doc.numPages, MAX_PDF_PAGES);
  if (total === 0) throw new PdfImportError('That PDF has no pages.');

  // Place the stack at the current viewport centre.
  const centre = editor.getViewportPageBounds().center;
  let cursorY = centre.y;
  const shapeIds = [];

  for (let pageNo = 1; pageNo <= total; pageNo++) {
    const page = await doc.getPage(pageNo);
    const { url, width, height } = await pageToDataUrl(page);

    // Lay pages out at their CSS size rather than their rendered pixel size.
    const w = width / RENDER_SCALE;
    const h = height / RENDER_SCALE;

    const assetId: TLAssetId = AssetRecordType.createId();
    editor.createAssets([
      AssetRecordType.create({
        id: assetId,
        type: 'image',
        typeName: 'asset',
        props: {
          name: `${file.name} — page ${pageNo}`,
          src: url,
          w: width,
          h: height,
          mimeType: 'image/jpeg',
          isAnimated: false,
        },
      }),
    ]);

    const shapeId = createShapeId();
    shapeIds.push(shapeId);
    editor.createShapes<TLImageShape>([
      {
        id: shapeId,
        type: 'image',
        x: centre.x - w / 2,
        y: cursorY,
        props: { assetId, w, h },
      },
    ]);

    cursorY += h + PAGE_GAP;
    onProgress?.(pageNo, total);
  }

  editor.setSelectedShapes(shapeIds);
  editor.zoomToSelection();
  return total;
}

export function isPdf(file: File) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}
