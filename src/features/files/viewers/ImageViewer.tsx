import { useEffect, useState } from 'react';
import { Download, ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon } from 'lucide-react';

interface ImageViewerProps {
  blob: Blob;
  fileName: string;
}

export function ImageViewer({ blob, fileName }: ImageViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    };

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

  return (
    <div className="flex h-full w-full flex-col bg-neutral-900 text-white">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/80 px-4 py-2 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} className="text-pink-500" />
          <span className="font-semibold truncate max-w-[200px]">{fileName}</span>
          {dimensions && (
            <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
              {dimensions.w} × {dimensions.h}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))}
            title="Zoom out"
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[11px] font-mono w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            title="Zoom in"
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            title="Reset zoom"
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <RotateCcw size={13} />
          </button>

          <button
            type="button"
            onClick={handleDownload}
            title="Download image"
            className="ml-2 inline-flex items-center gap-1 rounded-md bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
          >
            <Download size={12} />
            Download
          </button>
        </div>
      </div>

      {/* Main Image Canvas */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-6 bg-neutral-950">
        {objectUrl && (
          <img
            src={objectUrl}
            alt={fileName}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            className="max-h-[85vh] max-w-[85vw] object-contain transition-transform duration-100 select-none shadow-2xl rounded-lg"
          />
        )}
      </div>
    </div>
  );
}
