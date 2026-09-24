import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Upload,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { loadPdfJs } from '../import-pdf';

interface PdfViewerBlockProps {
  content: string; // Base64 data URL or empty
  meta?: {
    page?: number;
    zoom?: number;
    filename?: string;
  };
  onChange: (newContent: string, newMeta?: Record<string, any>) => void;
  readOnly?: boolean;
}

export function PdfViewerBlock({
  content,
  meta,
  onChange,
  readOnly = false,
}: PdfViewerBlockProps) {
  const [currentPage, setCurrentPage] = useState<number>(meta?.page || 1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(meta?.zoom || 1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderTaskRef = useRef<any>(null);

  // If content exists, render page
  useEffect(() => {
    let cancelled = false;

    if (!content) {
      return;
    }

    async function renderPdf() {
      setLoading(true);
      setError(null);

      try {
        const pdfjs = await loadPdfJs();
        // Support base64 data url or raw url
        let pdfData: Uint8Array | string = content;
        if (content.startsWith('data:application/pdf;base64,')) {
          const raw = atob(content.split(',')[1]);
          const arr = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) {
            arr[i] = raw.charCodeAt(i);
          }
          pdfData = arr;
        }

        const loadingTask = pdfjs.getDocument(
          typeof pdfData === 'string' ? { url: pdfData } : { data: pdfData },
        );
        const doc = await loadingTask.promise;
        if (cancelled) return;

        setTotalPages(doc.numPages);
        const pageNum = Math.min(Math.max(1, currentPage), doc.numPages);

        const page = await doc.getPage(pageNum);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: zoom * 1.5 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (!context) return;

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderTask = page.render({
          canvasContext: context,
          viewport,
        } as never);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('PDF render error:', err);
          setError(err.message || 'Failed to render PDF');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    renderPdf();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [content, currentPage, zoom]);

  const handleFileUpload = (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onChange(dataUrl, {
        page: 1,
        zoom: 1,
        filename: file.name,
      });
      setCurrentPage(1);
    };
    reader.readAsDataURL(file);
  };

  const handlePageChange = (newPage: number) => {
    const p = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(p);
    onChange(content, { ...meta, page: p, zoom });
  };

  const handleZoomChange = (delta: number) => {
    const nextZoom = Math.max(0.5, Math.min(3, Math.round((zoom + delta) * 10) / 10));
    setZoom(nextZoom);
    onChange(content, { ...meta, page: currentPage, zoom: nextZoom });
  };

  // Generate a handsome sample PDF directly in the browser if user wants quick test
  const loadSampleDoc = async () => {
    try {
      setLoading(true);
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      // Page 1
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 595, 842, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(26);
      doc.text('Drawgon Architecture Spec', 40, 80);
      doc.setFontSize(14);
      doc.setTextColor(148, 163, 184);
      doc.text('Document Blocks on Whiteboard Canvas', 40, 110);

      doc.setTextColor(226, 232, 240);
      doc.setFontSize(12);
      doc.text('1. Overview', 40, 160);
      doc.setFontSize(10);
      doc.setTextColor(203, 213, 225);
      doc.text(
        'Drawgon embedded document blocks allow real-time collaborative notes, code, spreadsheets,',
        40,
        185,
      );
      doc.text(
        'PDFs, and slideshow decks to live directly inside infinite whiteboards.',
        40,
        205,
      );

      doc.setFontSize(12);
      doc.setTextColor(226, 232, 240);
      doc.text('2. Specifications', 40, 245);
      doc.setFontSize(10);
      doc.setTextColor(203, 213, 225);
      doc.text('- Type-safe Custom Shapes with BaseBoxShapeUtil', 50, 270);
      doc.text('- Live Socket.IO Board Synchronization', 50, 290);
      doc.text('- Interactive HTML Container with isolated event propagation', 50, 310);
      doc.text('- Full responsive zoom and pan support', 50, 330);

      // Page 2
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 595, 842, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('Collaborative Data Flow', 40, 80);
      doc.setFontSize(10);
      doc.setTextColor(203, 213, 225);
      doc.text('Whiteboard State <---> MongoDB Engine <---> WebSocket Gateway', 40, 120);

      const dataUrl = doc.output('datauristring');
      onChange(dataUrl, {
        page: 1,
        zoom: 1,
        filename: 'Drawgon-Architecture-Spec.pdf',
      });
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || 'Failed to generate sample PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-neutral-900 text-neutral-100 select-none">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = '';
        }}
      />

      {/* Top action / pagination bar */}
      <div
        className="flex shrink-0 items-center justify-between border-b border-neutral-800 bg-[#1e222b] px-2.5 py-1.5 text-xs"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            title="Previous Page"
            className="rounded p-1 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="font-mono text-[11px] text-neutral-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            title="Next Page"
            className="rounded p-1 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <button
            type="button"
            onClick={() => handleZoomChange(-0.2)}
            title="Zoom Out"
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            <ZoomOut size={13} />
          </button>
          <span className="font-mono text-[10px] text-neutral-400 min-w-[32px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => handleZoomChange(0.2)}
            title="Zoom In"
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            <ZoomIn size={13} />
          </button>

          {!readOnly && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload another PDF"
              className="ml-1 flex items-center gap-1 rounded bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-200 hover:bg-neutral-700"
            >
              <Upload size={11} />
              <span>Replace</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div
        className="relative flex-1 overflow-auto bg-[#14161a] p-4 flex items-center justify-center"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs">
            <Loader2 className="animate-spin text-brand" size={24} />
            <span className="mt-2 text-xs text-neutral-300">Rendering PDF...</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-950/60 border border-red-800/80 p-3 text-center text-xs text-red-300">
            <p className="font-semibold">Unable to display PDF</p>
            <p className="text-[11px] mt-1">{error}</p>
          </div>
        )}

        {!content ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/20 text-brand mb-3">
              <FileText size={24} />
            </div>
            <h4 className="text-sm font-semibold text-neutral-200">No PDF Loaded</h4>
            <p className="mt-1 text-xs text-neutral-400 max-w-xs">
              Upload any PDF document or load a sample architecture spec to embed on the board.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-brand/90 transition"
              >
                <Upload size={13} />
                <span>Upload PDF</span>
              </button>
              <button
                type="button"
                onClick={loadSampleDoc}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-700 transition"
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>Load Sample Spec</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="shadow-2xl rounded border border-neutral-800 bg-white overflow-hidden">
            <canvas ref={canvasRef} className="block max-w-none" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex shrink-0 items-center justify-between border-t border-neutral-800 bg-[#16181d] px-3 py-1 text-[10px] text-neutral-500"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span className="truncate max-w-[200px]">
          {meta?.filename || 'Document.pdf'}
        </span>
        <span>
          {totalPages} {totalPages === 1 ? 'page' : 'pages'}
        </span>
      </div>
    </div>
  );
}
