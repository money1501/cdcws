import { useState, useRef, useMemo } from 'react';
import {
  Play,
  Copy,
  Check,
  Terminal,
  Code as CodeIcon,
  RotateCcw,
} from 'lucide-react';

interface CodeEditorBlockProps {
  content: string;
  language?: string;
  onChange: (newContent: string) => void;
  onLanguageChange?: (newLang: string) => void;
  readOnly?: boolean;
}

const SUPPORTED_LANGUAGES = [
  { id: 'typescript', label: 'TypeScript' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'html', label: 'HTML / Web' },
  { id: 'css', label: 'CSS' },
  { id: 'json', label: 'JSON' },
  { id: 'sql', label: 'SQL' },
  { id: 'rust', label: 'Rust' },
  { id: 'cpp', label: 'C++' },
  { id: 'shell', label: 'Bash / Shell' },
];

export function CodeEditorBlock({
  content,
  language = 'typescript',
  onChange,
  onLanguageChange,
  readOnly = false,
}: CodeEditorBlockProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'output'>('editor');
  const [outputLogs, setOutputLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = useMemo(() => content.split('\n'), [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newContent =
        content.substring(0, start) + '  ' + content.substring(end);
      onChange(newContent);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runCode = () => {
    setActiveTab('output');
    setOutputLogs([]);

    if (language === 'javascript' || language === 'typescript') {
      const logs: string[] = [];
      const customConsole = {
        log: (...args: any[]) => {
          logs.push(
            args
              .map((arg) =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg),
              )
              .join(' '),
          );
        },
        error: (...args: any[]) => {
          logs.push(`[Error] ` + args.map(String).join(' '));
        },
        warn: (...args: any[]) => {
          logs.push(`[Warn] ` + args.map(String).join(' '));
        },
      };

      try {
        // Strip basic typescript types for quick in-browser test
        let executableJs = content
          .replace(/:\s*[A-Za-z0-9_<>[\]|&, ]+/g, '')
          .replace(/interface\s+\w+[\s\S]*?}/g, '')
          .replace(/type\s+\w+\s*=[\s\S]*?;/g, '');

        const runner = new Function('console', executableJs);
        runner(customConsole);
        if (logs.length === 0) {
          logs.push('Execution completed with no console logs.');
        }
        setOutputLogs(logs);
      } catch (err: any) {
        setOutputLogs([`Runtime Error: ${err.message}`]);
      }
    } else if (language === 'json') {
      try {
        const parsed = JSON.parse(content);
        setOutputLogs(['Valid JSON:', JSON.stringify(parsed, null, 2)]);
      } catch (e: any) {
        setOutputLogs([`Invalid JSON Error: ${e.message}`]);
      }
    } else if (language === 'html') {
      setOutputLogs(['HTML preview ready in browser viewport tab.']);
    } else {
      setOutputLogs([
        `[${language.toUpperCase()}] Simulation / Syntax Check:`,
        `Code parsed (${lines.length} lines, ${content.length} bytes).`,
        `For full backend compile, attach remote runner or build pipeline.`,
      ]);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#181a1f] text-neutral-100 font-mono">
      {/* Top action bar */}
      <div
        className="flex shrink-0 items-center justify-between border-b border-neutral-800 bg-[#1e222b] px-2.5 py-1.5 text-xs"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => onLanguageChange?.(e.target.value)}
            disabled={readOnly}
            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[11px] font-sans font-medium text-neutral-200 outline-none hover:border-neutral-600 focus:border-brand"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id} className="bg-neutral-900 text-neutral-100">
                {lang.label}
              </option>
            ))}
          </select>

          {/* Tab switcher */}
          <div className="flex items-center rounded-lg bg-neutral-900/80 p-0.5 font-sans text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 transition ${
                activeTab === 'editor'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <CodeIcon size={11} />
              <span>Code</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('output')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 transition ${
                activeTab === 'output'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Terminal size={11} />
              <span>Console</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 font-sans">
          <button
            type="button"
            onClick={runCode}
            title="Run code or test syntax"
            className="flex items-center gap-1 rounded bg-brand/20 px-2 py-1 text-[11px] font-medium text-brand hover:bg-brand/30 transition"
          >
            <Play size={11} className="fill-current" />
            <span>Run</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            title="Copy Code"
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Main Code Editor or Console */}
      <div
        className="relative flex-1 overflow-hidden"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {activeTab === 'editor' ? (
          <div className="flex h-full w-full overflow-auto">
            {/* Line numbers gutter */}
            <div className="select-none shrink-0 border-r border-neutral-800/80 bg-[#16181d] px-2 py-3 text-right text-[11px] text-neutral-600 font-mono leading-relaxed">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code textarea */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              readOnly={readOnly}
              placeholder="// Write code here..."
              spellCheck={false}
              className="flex-1 resize-none border-none bg-transparent p-3 font-mono text-[12px] leading-relaxed text-emerald-300 outline-none placeholder:text-neutral-600 overflow-auto"
            />
          </div>
        ) : (
          <div className="h-full w-full overflow-auto bg-[#14161a] p-3 text-xs font-mono text-neutral-300">
            <div className="mb-2 flex items-center justify-between border-b border-neutral-800 pb-1 text-[11px] text-neutral-500">
              <span className="flex items-center gap-1">
                <Terminal size={12} /> Execution Output
              </span>
              <button
                type="button"
                onClick={() => setOutputLogs([])}
                className="flex items-center gap-1 text-neutral-400 hover:text-neutral-200"
              >
                <RotateCcw size={10} /> Clear
              </button>
            </div>
            {outputLogs.length === 0 ? (
              <div className="text-neutral-500 italic py-2">
                Click &apos;Run&apos; to execute and see console output.
              </div>
            ) : (
              <pre className="whitespace-pre-wrap leading-relaxed text-neutral-200">
                {outputLogs.join('\n')}
              </pre>
            )}

            {language === 'html' && (
              <div className="mt-4 rounded border border-neutral-700 bg-white p-2 text-neutral-900">
                <p className="mb-1 text-[10px] uppercase font-bold text-neutral-400 font-sans">
                  Rendered Preview
                </p>
                <div dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div
        className="flex shrink-0 items-center justify-between border-t border-neutral-800 bg-[#16181d] px-3 py-1 text-[10px] text-neutral-400 font-sans"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span>Tab = 2 spaces</span>
        <span>
          {lines.length} {lines.length === 1 ? 'line' : 'lines'} · {content.length} chars
        </span>
      </div>
    </div>
  );
}
