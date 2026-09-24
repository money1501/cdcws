import { useEffect, useState, useRef, useCallback } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Table,
  Code,
  Image as ImageIcon,
  Lock,
  Plus,
  Maximize2,
  Minimize2,
  FolderLock,
  Download,
} from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import {
  getPersonalFiles,
  savePersonalFile,
  deletePersonalFile,
  type StoredPersonalFile,
  formatFileSize,
} from './personalFilesDb';
import { usePersonalFilesStore } from './usePersonalFilesStore';
import { PdfViewer } from './viewers/PdfViewer';
import { DocxViewer } from './viewers/DocxViewer';
import { SpreadsheetViewer } from './viewers/SpreadsheetViewer';
import { CodeTextViewer } from './viewers/CodeTextViewer';
import { ImageViewer } from './viewers/ImageViewer';

interface PersonalFilesSidebarProps {
  boardId: string;
}

const DEFAULT_WIDTH = 540;
const MIN_WIDTH = 380;
const MAX_WIDTH = 920;

export function PersonalFilesSidebar({ boardId }: PersonalFilesSidebarProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id || 'local_user';

  const { isOpen, setIsOpen, toggleOpen, setFileCount } = usePersonalFilesStore();
  const [files, setFiles] = useState<StoredPersonalFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files from IndexedDB
  const refreshFiles = useCallback(async () => {
    try {
      const list = await getPersonalFiles(boardId, userId);
      setFiles(list);
      setFileCount(list.length);
      if (list.length > 0) {
        // If current active is missing or null, pick first
        setActiveFileId((current) => {
          if (current && list.some((f) => f.id === current)) return current;
          return list[0].id;
        });
      } else {
        setActiveFileId(null);
      }
    } finally {
      setLoading(false);
    }
  }, [boardId, userId, setFileCount]);

  useEffect(() => {
    void refreshFiles();
  }, [refreshFiles]);

  // Handle file uploads
  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;

    for (const file of arr) {
      await savePersonalFile(boardId, file, userId);
    }
    await refreshFiles();
    // Open sidebar if it was closed
    setIsOpen(true);
  };

  // Delete a file
  const handleDeleteFile = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this private file?')) return;
    await deletePersonalFile(fileId);
    await refreshFiles();
  };

  // Drag-and-drop on sidebar
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Resizing logic via left border drag handle
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + deltaX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const activeFile = files.find((f) => f.id === activeFileId) || null;

  // Determine file icon
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return <FileText size={14} className="text-red-500" />;
    if (['docx', 'doc'].includes(ext)) return <FileText size={14} className="text-blue-500" />;
    if (['xlsx', 'xls', 'csv'].includes(ext)) return <Table size={14} className="text-emerald-500" />;
    if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext))
      return <ImageIcon size={14} className="text-pink-500" />;
    return <Code size={14} className="text-purple-500" />;
  };

  // Render appropriate viewer
  const renderViewer = () => {
    if (!activeFile) return null;
    const ext = activeFile.name.split('.').pop()?.toLowerCase() || '';

    if (ext === 'pdf') {
      return <PdfViewer blob={activeFile.blob} fileName={activeFile.name} />;
    }
    if (['docx', 'doc'].includes(ext)) {
      return <DocxViewer blob={activeFile.blob} fileName={activeFile.name} />;
    }
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return <SpreadsheetViewer blob={activeFile.blob} fileName={activeFile.name} />;
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)) {
      return <ImageViewer blob={activeFile.blob} fileName={activeFile.name} />;
    }
    if (
      [
        'txt',
        'md',
        'json',
        'js',
        'ts',
        'tsx',
        'jsx',
        'py',
        'html',
        'css',
        'yaml',
        'yml',
        'xml',
        'sql',
      ].includes(ext) ||
      activeFile.type.startsWith('text/')
    ) {
      return <CodeTextViewer blob={activeFile.blob} fileName={activeFile.name} />;
    }

    // Generic fallback for binary files
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center text-neutral-500">
        <FileText size={48} className="text-neutral-400 mb-3" />
        <h4 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
          {activeFile.name}
        </h4>
        <p className="mt-1 text-xs text-neutral-400">
          {formatFileSize(activeFile.size)} • Preview not available for this file type
        </p>
        <button
          type="button"
          onClick={() => {
            const url = URL.createObjectURL(activeFile.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = activeFile.name;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-brand/90"
        >
          <Download size={14} />
          Download File
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Floating collapsed trigger button on the right edge */}
      {!isOpen && (
        <button
          type="button"
          onClick={toggleOpen}
          title="Open Personal Files (Claude-style side panel)"
          className="fixed right-3 top-20 z-[300] inline-flex items-center gap-2 rounded-full border border-neutral-200/90 bg-white/95 px-3 py-2 text-xs font-semibold text-neutral-700 shadow-lg backdrop-blur-md transition-all hover:bg-neutral-100 hover:shadow-xl dark:border-neutral-800 dark:bg-neutral-900/95 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <FolderLock size={15} className="text-amber-500" />
          <span className="hidden sm:inline">Files</span>
          {files.length > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
              {files.length}
            </span>
          )}
        </button>
      )}

      {/* The Collapsible Sidebar Container */}
      {isOpen && (
        <aside
          style={{ width: isMaximized ? '100%' : `${width}px` }}
          className={`relative z-[450] flex h-full flex-col border-l border-neutral-200 bg-white shadow-2xl transition-all duration-150 dark:border-neutral-800 dark:bg-neutral-950 ${
            isResizing ? 'select-none' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => void handleDrop(e)}
        >
          {/* Resize Handle on the left border */}
          {!isMaximized && (
            <div
              onMouseDown={handleMouseDownResize}
              title="Drag to resize panel"
              className="absolute left-0 top-0 bottom-0 z-50 w-1.5 -translate-x-1/2 cursor-col-resize transition hover:bg-brand active:bg-brand"
            />
          )}

          {/* Top Panel Header (Claude-style) */}
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <Lock size={13} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Personal Files
                  </span>
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                    Private to you
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  Separate from canvas • Only visible on this browser
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Add file button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Add file (PDF, DOCX, XLSX, etc.)"
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 shadow-2xs transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                <Plus size={13} />
                <span>Add</span>
              </button>

              {/* Maximize / Restore width toggle */}
              <button
                type="button"
                onClick={() => setIsMaximized((m) => !m)}
                title={isMaximized ? 'Restore panel size' : 'Expand panel full width'}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200/70 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>

              {/* Close/Collapse panel */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Collapse sidebar"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200/70 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.html,.css,.png,.jpg,.jpeg,.svg,.webp"
            onChange={(e) => {
              if (e.target.files) {
                void handleUploadFiles(e.target.files);
                e.target.value = '';
              }
            }}
          />

          {/* Claude-Style File Tab Bar (when files exist) */}
          {files.length > 0 && (
            <div className="flex items-center gap-1 border-b border-neutral-200 bg-neutral-100/70 px-2 py-1.5 overflow-x-auto dark:border-neutral-800 dark:bg-neutral-900/50">
              {files.map((file) => {
                const isActive = file.id === activeFileId;
                return (
                  <div
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    className={`group relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition cursor-pointer select-none ${
                      isActive
                        ? 'bg-white font-semibold text-neutral-900 shadow-xs border border-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700'
                        : 'text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    {getFileIcon(file.name)}
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={(e) => void handleDeleteFile(e, file.id)}
                      title="Remove file"
                      className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-red-500 dark:hover:bg-neutral-700"
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}

              {/* Quick plus tab at end */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Add another file"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-200/70 hover:text-neutral-700 dark:hover:bg-neutral-800"
              >
                <Plus size={13} />
              </button>
            </div>
          )}

          {/* Main Area: Active File Viewer or Empty Dropzone */}
          <div className="relative flex-1 overflow-hidden">
            {/* Drag & drop highlight overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-brand/10 backdrop-blur-xs border-2 border-dashed border-brand text-brand">
                <UploadCloud size={40} className="animate-bounce" />
                <p className="mt-2 text-sm font-semibold">Drop files here to upload</p>
                <p className="text-xs opacity-75">PDF, DOCX, XLSX, CSV, Code, Images</p>
              </div>
            )}

            {loading ? (
              <div className="flex h-full items-center justify-center p-8 text-neutral-400">
                <span className="text-xs animate-pulse">Loading personal files...</span>
              </div>
            ) : files.length === 0 ? (
              /* Empty State / Dropzone */
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 p-8 transition hover:border-brand hover:bg-brand/5 cursor-pointer dark:border-neutral-700 dark:hover:border-brand dark:hover:bg-brand/5 max-w-sm w-full"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500 transition group-hover:scale-110 group-hover:bg-brand group-hover:text-white dark:bg-neutral-800 dark:text-neutral-400">
                    <UploadCloud size={24} />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    Drop files here, or browse
                  </h3>
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                    Supports DOCX, PDF, XLSX, CSV, Code, Images & Markdown
                  </p>

                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {['PDF', 'DOCX', 'XLSX', 'CSV', 'MD', 'CODE'].map((fmt) => (
                      <span
                        key={fmt}
                        className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex items-start gap-2 max-w-sm text-left text-xs text-neutral-400 dark:text-neutral-500">
                  <Lock size={14} className="shrink-0 text-amber-500 mt-0.5" />
                  <span>
                    <strong>Strictly Private:</strong> Files are stored in your browser's private local database for this board. Collaborators on the board cannot view, download, or access them.
                  </span>
                </div>
              </div>
            ) : (
              /* File Viewer */
              renderViewer()
            )}
          </div>
        </aside>
      )}
    </>
  );
}
