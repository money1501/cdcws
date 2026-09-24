import { useEffect, useState, useMemo } from 'react';
import { Download, Copy, Check, Code, FileText, Search } from 'lucide-react';

interface CodeTextViewerProps {
  blob: Blob;
  fileName: string;
}

export function CodeTextViewer({ blob, fileName }: CodeTextViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>(
    fileName.endsWith('.md') ? 'formatted' : 'raw',
  );

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function readText() {
      try {
        const text = await blob.text();
        if (active) {
          // If JSON, format cleanly
          if (fileName.endsWith('.json')) {
            try {
              const parsed = JSON.parse(text);
              setContent(JSON.stringify(parsed, null, 2));
            } catch {
              setContent(text);
            }
          } else {
            setContent(text);
          }
          setLoading(false);
        }
      } catch {
        if (active) {
          setContent('Error reading text file.');
          setLoading(false);
        }
      }
    }

    void readText();

    return () => {
      active = false;
    };
  }, [blob, fileName]);

  const lines = useMemo(() => {
    return content.split('\n');
  }, [content]);

  const filteredLines = useMemo(() => {
    if (!searchQuery.trim()) return lines.map((l, i) => ({ text: l, lineNum: i + 1 }));
    const q = searchQuery.toLowerCase();
    return lines
      .map((l, i) => ({ text: l, lineNum: i + 1 }))
      .filter((item) => item.text.toLowerCase().includes(q));
  }, [lines, searchQuery]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isMarkdown = fileName.endsWith('.md');
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-neutral-950">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-white/90 px-4 py-2 text-xs backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/90">
        <div className="flex items-center gap-2">
          {isMarkdown ? (
            <FileText size={14} className="text-amber-500" />
          ) : (
            <Code size={14} className="text-purple-500" />
          )}
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[180px]">
            {fileName}
          </span>
          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 uppercase">
            {fileName.split('.').pop() || 'TXT'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isMarkdown && (
            <div className="flex items-center rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setViewMode('formatted')}
                className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                  viewMode === 'formatted'
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
                }`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                  viewMode === 'raw'
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
                }`}
              >
                Code
              </button>
            </div>
          )}

          {viewMode === 'raw' && (
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="h-7 w-28 sm:w-36 rounded-md border border-neutral-200 bg-neutral-50 pl-6 pr-2 text-xs text-neutral-800 outline-none transition focus:border-brand focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:border-brand"
              />
            </div>
          )}

          <span className="hidden sm:inline text-[11px] text-neutral-400">
            {lines.length} lines • {wordCount} words
          </span>

          <button
            type="button"
            onClick={() => void handleCopy()}
            title="Copy all text"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            title="Download file"
            className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <Download size={12} />
            Download
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950">
        {loading && (
          <div className="flex h-64 items-center justify-center text-xs text-neutral-400">
            <span className="animate-pulse">Loading text...</span>
          </div>
        )}

        {!loading && isMarkdown && viewMode === 'formatted' && (
          <div className="mx-auto max-w-3xl p-6">
            <div className="rounded-xl border border-neutral-200/90 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 prose prose-sm max-w-none dark:prose-invert">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
                {content}
              </pre>
            </div>
          </div>
        )}

        {!loading && (viewMode === 'raw' || !isMarkdown) && (
          <div className="p-4 font-mono text-xs leading-relaxed">
            <table className="w-full border-collapse">
              <tbody>
                {filteredLines.map((item) => (
                  <tr key={item.lineNum} className="hover:bg-neutral-100/70 dark:hover:bg-neutral-900">
                    <td className="w-12 select-none border-r border-neutral-200 pr-3 text-right text-[11px] text-neutral-400 dark:border-neutral-800 dark:text-neutral-600">
                      {item.lineNum}
                    </td>
                    <td className="pl-4 whitespace-pre-wrap break-all text-neutral-800 dark:text-neutral-200 font-mono">
                      {item.text || ' '}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
