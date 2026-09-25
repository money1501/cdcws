import { useEffect, useRef, useState } from 'react';
import {
  defaultHandleExternalFileContent,
  useDefaultHelpers,
  useEditor,
  useToasts,
  useTranslation,
} from '@tldraw/tldraw';
import { FileText } from 'lucide-react';
import { MAX_PDF_PAGES, importPdfToCanvas, isPdf } from './import-pdf';
import { useAuthModal } from '@/lib/auth-modal-context';

/**
 * Renders inside <Tldraw> so it can reach the editor and the UI context.
 * Takes over file drops for PDFs and hands everything else back to tldraw's
 * default handler, so image drops keep working exactly as before.
 */
export function PdfImporter({ readOnly = false }: { readOnly?: boolean }) {
  const editor = useEditor();
  const helpers = useDefaultHelpers();
  const toasts = useToasts();
  const msg = useTranslation();
  const { requireAuth } = useAuthModal();
  const [busy, setBusy] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function runImport(file: File) {
    setBusy('Reading PDF...');
    try {
      const pages = await importPdfToCanvas(editor, file, (done, total) =>
        setBusy(`Importing page ${done} of ${total}...`),
      );
      if (pages === MAX_PDF_PAGES) {
        helpers.addToast({
          title: 'Partial import',
          description: `Only the first ${MAX_PDF_PAGES} pages were imported.`,
        });
      }
    } catch (e) {
      helpers.addToast({
        title: 'Could not import PDF',
        description: e instanceof Error ? e.message : 'Unknown error.',
        severity: 'error',
      });
    } finally {
      setBusy(null);
    }
  }

  function handleImportRequest(file: File) {
    requireAuth(() => runImport(file), {
      reason: 'upload',
      title: 'Log in to import PDF',
      description: 'Sign in to convert and import PDF documents onto the canvas.',
    });
  }

  useEffect(() => {
    if (readOnly) return;
    editor.registerExternalContentHandler('files', async (content) => {
      const pdfs = content.files.filter(isPdf);
      const rest = content.files.filter((f) => !isPdf(f));

      for (const pdf of pdfs) {
        handleImportRequest(pdf);
      }
      if (rest.length > 0) {
        await defaultHandleExternalFileContent(
          editor,
          { ...content, files: rest },
          { toasts, msg },
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, readOnly, requireAuth]);

  if (readOnly) return null;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) handleImportRequest(file);
        }}
      />
      <button
        type="button"
        onClick={() => {
          requireAuth(() => fileInputRef.current?.click(), {
            reason: 'upload',
            title: 'Log in to import PDF',
            description: 'Sign in to convert and import PDF documents onto the canvas.',
          });
        }}
        disabled={busy !== null}
        title="Import a PDF onto the canvas"
        className="pointer-events-auto absolute left-1/2 top-3 z-[400] inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-md transition hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        <FileText size={13} />
        {busy ?? 'Import PDF'}
      </button>
    </>
  );
}
