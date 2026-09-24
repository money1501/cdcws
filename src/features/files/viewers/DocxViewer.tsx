import { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { Download, FileText, AlertCircle, Copy, Check } from 'lucide-react';

interface DocxViewerProps {
  blob: Blob;
  fileName: string;
}

export function DocxViewer({ blob, fileName }: DocxViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function parseDocx() {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const raw = await mammoth.extractRawText({ arrayBuffer });

        if (active) {
          setHtmlContent(result.value || '<p><em>Empty document.</em></p>');
          setRawText(raw.value || '');
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Failed to parse Word document.');
          setLoading(false);
        }
      }
    }

    void parseDocx();

    return () => {
      active = false;
    };
  }, [blob]);

  const handleDownload = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = async () => {
    if (!rawText) return;
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const wordCount = rawText ? rawText.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = rawText ? rawText.length : 0;

  return (
    <div className="flex h-full w-full flex-col bg-neutral-100 dark:bg-neutral-950">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white/80 px-4 py-2 text-xs backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-blue-500" />
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">
            {fileName}
          </span>
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
            DOCX
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline text-[11px] text-neutral-400 dark:text-neutral-500 mr-2">
            {wordCount} words • {charCount} chars
          </span>

          <button
            type="button"
            onClick={() => void handleCopyText()}
            title="Copy plain text"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            title="Download Word Document"
            className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <Download size={12} />
            Download
          </button>
        </div>
      </div>

      {/* Main Document Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading && (
          <div className="flex h-64 items-center justify-center text-xs text-neutral-400">
            <span className="animate-pulse">Formatting Word document...</span>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle size={16} />
              Could not preview document
            </div>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={handleDownload}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white transition hover:bg-red-700"
            >
              <Download size={13} />
              Download original file
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="mx-auto max-w-3xl rounded-xl border border-neutral-200/90 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            {/* Rendered HTML with custom styling */}
            <div
              className="docx-content prose prose-sm max-w-none dark:prose-invert [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-neutral-900 dark:[&_h1]:text-neutral-50 [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-neutral-700 dark:[&_p]:text-neutral-300 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-neutral-300 dark:[&_table]:border-neutral-700 [&_th]:border [&_th]:border-neutral-300 dark:[&_th]:border-neutral-700 [&_th]:bg-neutral-100 dark:[&_th]:bg-neutral-800 [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-neutral-300 dark:[&_td]:border-neutral-700 [&_td]:p-2 [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 dark:[&_blockquote]:border-neutral-700 [&_blockquote]:pl-4 [&_blockquote]:italic"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
