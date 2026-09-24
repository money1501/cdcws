import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';

interface PdfViewerProps {
  blob: Blob;
  fileName: string;
}

export function PdfViewer({ blob, fileName }: PdfViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    a.click();
  };

  const handleOpenExternal = () => {
    window.open(objectUrl, '_blank');
  };

  if (!objectUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 text-neutral-400">
        <span className="animate-pulse text-xs">Loading PDF...</span>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-neutral-100 dark:bg-neutral-950">
      {/* Top quick actions */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white/80 px-4 py-2 text-xs backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
          <FileText size={14} className="text-red-500" />
          <span className="font-medium text-neutral-700 dark:text-neutral-200 truncate max-w-[200px]">
            {fileName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleOpenExternal}
            title="Open in new window"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <ExternalLink size={12} />
            New tab
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Download PDF"
            className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <Download size={12} />
            Download
          </button>
        </div>
      </div>

      {/* Embedded PDF iframe */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <iframe
          src={`${objectUrl}#toolbar=1`}
          title={fileName}
          className="h-full w-full border-none"
        />
      </div>
    </div>
  );
}
