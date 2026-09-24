import { useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Eye,
  Edit3,
  Copy,
  Check,
} from 'lucide-react';

interface TextEditorBlockProps {
  content: string;
  onChange: (newContent: string) => void;
  readOnly?: boolean;
}

export function TextEditorBlock({
  content,
  onChange,
  readOnly = false,
}: TextEditorBlockProps) {
  const [isPreview, setIsPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const insertText = (prefix: string, suffix: string = '', defaultPlaceholder = '') => {
    if (readOnly || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selected}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    onChange(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length,
      );
    }, 0);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full w-full flex-col bg-inherit text-inherit">
      {/* Toolbar */}
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-1 border-b border-neutral-200/80 bg-neutral-50/90 px-2.5 py-1.5 backdrop-blur-sm dark:border-neutral-800/80 dark:bg-neutral-900/90"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-0.5">
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => insertText('**', '**', 'bold text')}
                title="Bold"
                className="rounded p-1 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <Bold size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertText('*', '*', 'italic text')}
                title="Italic"
                className="rounded p-1 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <Italic size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertText('`', '`', 'code')}
                title="Inline Code"
                className="rounded p-1 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <Code size={13} />
              </button>

              <div className="mx-1 h-3.5 w-px bg-neutral-300 dark:bg-neutral-700" />

              <button
                type="button"
                onClick={() => insertText('# ', '', 'Heading 1')}
                title="Heading 1"
                className="rounded p-1 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <Heading1 size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertText('## ', '', 'Heading 2')}
                title="Heading 2"
                className="rounded p-1 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <Heading2 size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertText('### ', '', 'Heading 3')}
                title="Heading 3"
                className="rounded p-1 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <Heading3 size={13} />
              </button>

              <div className="mx-1 h-3.5 w-px bg-neutral-300 dark:bg-neutral-700" />

              <button
                type="button"
                onClick={() => insertText('\n- ', '', 'List item')}
                title="Bullet List"
                className="rounded p-1 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <List size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertText('\n1. ', '', 'Numbered item')}
                title="Numbered List"
                className="rounded p-1 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <ListOrdered size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertText('\n- [ ] ', '', 'Task')}
                title="Checklist"
                className="rounded p-1 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <CheckSquare size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertText('\n> ', '', 'Quote text')}
                title="Quote"
                className="rounded p-1 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <Quote size={13} />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            title={isPreview ? 'Switch to Edit' : 'Switch to Preview'}
            className="flex items-center gap-1 rounded bg-neutral-200/70 px-2 py-0.5 text-[11px] font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            {isPreview ? <Edit3 size={11} /> : <Eye size={11} />}
            <span>{isPreview ? 'Edit' : 'Preview'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            title="Copy Text"
            className="rounded p-1 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Editor / Preview Area */}
      <div
        className="relative flex-1 overflow-auto p-3"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {isPreview || readOnly ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap font-sans">
            {content || <span className="italic text-neutral-400">Empty document.</span>}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your notes, ideas, or markdown here..."
            className="h-full w-full resize-none border-none bg-transparent font-sans text-xs leading-relaxed text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
            spellCheck={false}
          />
        )}
      </div>

      {/* Footer Info */}
      <div
        className="flex shrink-0 items-center justify-between border-t border-neutral-200/60 bg-neutral-100/60 px-3 py-1 text-[10px] text-neutral-500 dark:border-neutral-800/60 dark:bg-neutral-900/60 dark:text-neutral-400"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span>Markdown enabled</span>
        <span>
          {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} chars
        </span>
      </div>
    </div>
  );
}
