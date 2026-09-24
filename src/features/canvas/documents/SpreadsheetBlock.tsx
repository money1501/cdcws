import { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Calculator,
} from 'lucide-react';
import { DEFAULT_SPREADSHEET_CELLS } from './DocumentBlockTypes';

interface SpreadsheetBlockProps {
  content: string; // Serialized JSON string of cells: Record<string, string>
  meta?: {
    rows?: number;
    cols?: number;
  };
  onChange: (newContent: string, newMeta?: { rows: number; cols: number }) => void;
  readOnly?: boolean;
}

const DEFAULT_COLS = 5; // A, B, C, D, E
const DEFAULT_ROWS = 8; // 1 to 8

function getColLetter(colIdx: number): string {
  let letter = '';
  while (colIdx >= 0) {
    letter = String.fromCharCode(65 + (colIdx % 26)) + letter;
    colIdx = Math.floor(colIdx / 26) - 1;
  }
  return letter;
}

function parseCellCoordinates(key: string): { col: string; row: number } | null {
  const match = key.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  return { col: match[1].toUpperCase(), row: parseInt(match[2], 10) };
}

function colToIdx(col: string): number {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
}

export function SpreadsheetBlock({
  content,
  meta,
  onChange,
  readOnly = false,
}: SpreadsheetBlockProps) {
  const [activeCell, setActiveCell] = useState<string>('A1');
  const [editingCell, setEditingCell] = useState<string | null>(null);

  const numCols = meta?.cols || DEFAULT_COLS;
  const numRows = meta?.rows || DEFAULT_ROWS;

  const cells: Record<string, string> = useMemo(() => {
    try {
      if (!content || content.trim() === '') return DEFAULT_SPREADSHEET_CELLS;
      return JSON.parse(content);
    } catch {
      return DEFAULT_SPREADSHEET_CELLS;
    }
  }, [content]);

  // Evaluator for formulas like =SUM(A1:A4), =AVERAGE(B1:B3), =A1+B1
  const evaluateCell = useCallback(
    function evaluate(key: string, visited: Set<string> = new Set()): number | string {
      const raw = cells[key] ?? '';
      if (!raw.startsWith('=')) {
        const num = Number(raw);
        return isNaN(num) || raw.trim() === '' ? raw : num;
      }

      if (visited.has(key)) return '#CYCLE!';
      visited.add(key);

      const expr = raw.slice(1).trim().toUpperCase();

      // Range functions: SUM, AVERAGE, AVG, COUNT, MIN, MAX
      const rangeMatch = expr.match(/^(SUM|AVERAGE|AVG|COUNT|MIN|MAX)\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
      if (rangeMatch) {
        const func = rangeMatch[1];
        const start = parseCellCoordinates(rangeMatch[2]);
        const end = parseCellCoordinates(rangeMatch[3]);
        if (!start || !end) return '#REF!';

        const startCol = Math.min(colToIdx(start.col), colToIdx(end.col));
        const endCol = Math.max(colToIdx(start.col), colToIdx(end.col));
        const startRow = Math.min(start.row, end.row);
        const endRow = Math.max(start.row, end.row);

        const values: number[] = [];
        for (let c = startCol; c <= endCol; c++) {
          for (let r = startRow; r <= endRow; r++) {
            const k = `${getColLetter(c)}${r}`;
            const val = evaluate(k, new Set(visited));
            if (typeof val === 'number' && !isNaN(val)) {
              values.push(val);
            }
          }
        }

        if (values.length === 0) return 0;
        switch (func) {
          case 'SUM':
            return values.reduce((a, b) => a + b, 0);
          case 'AVERAGE':
          case 'AVG':
            return values.reduce((a, b) => a + b, 0) / values.length;
          case 'COUNT':
            return values.length;
          case 'MIN':
            return Math.min(...values);
          case 'MAX':
            return Math.max(...values);
          default:
            return 0;
        }
      }

      // Simple math expressions: A1 + B1, A1 * 2, etc.
      try {
        const substituted = expr.replace(/([A-Z]+\d+)/g, (match) => {
          const v = evaluate(match, new Set(visited));
          return typeof v === 'number' ? String(v) : '0';
        });

        // Basic sanitized evaluation
        if (/^[\d+\-*/().\s]+$/.test(substituted)) {
          // eslint-disable-next-line no-eval
          const result = Function(`'use strict'; return (${substituted})`)();
          return typeof result === 'number' && isFinite(result)
            ? Math.round(result * 100) / 100
            : '#ERR!';
        }
      } catch {
        return '#ERR!';
      }

      return '#ERR!';
    },
    [cells],
  );

  const updateCellValue = (cellKey: string, value: string) => {
    if (readOnly) return;
    const nextCells = { ...cells, [cellKey]: value };
    onChange(JSON.stringify(nextCells), { rows: numRows, cols: numCols });
  };

  const addRow = () => {
    if (readOnly) return;
    onChange(JSON.stringify(cells), { rows: numRows + 1, cols: numCols });
  };

  const removeRow = () => {
    if (readOnly || numRows <= 2) return;
    onChange(JSON.stringify(cells), { rows: numRows - 1, cols: numCols });
  };

  const addColumn = () => {
    if (readOnly || numCols >= 15) return;
    onChange(JSON.stringify(cells), { rows: numRows, cols: numCols + 1 });
  };

  const removeColumn = () => {
    if (readOnly || numCols <= 2) return;
    onChange(JSON.stringify(cells), { rows: numRows, cols: numCols - 1 });
  };

  const exportCSV = () => {
    const csvRows: string[] = [];
    // Header row
    const headerCols: string[] = [];
    for (let c = 0; c < numCols; c++) {
      headerCols.push(getColLetter(c));
    }
    csvRows.push(headerCols.join(','));

    // Rows
    for (let r = 1; r <= numRows; r++) {
      const rowVals: string[] = [];
      for (let c = 0; c < numCols; c++) {
        const k = `${getColLetter(c)}${r}`;
        const val = evaluateCell(k);
        rowVals.push(`"${String(val).replace(/"/g, '""')}"`);
      }
      csvRows.push(rowVals.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-sheet.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full w-full flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-sans select-none">
      {/* Top Toolbar: fx & Table operations */}
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-1 border-b border-neutral-200 bg-neutral-50 px-2.5 py-1.5 dark:border-neutral-800 dark:bg-neutral-900"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-1 items-center gap-2 min-w-[200px]">
          {/* Active cell label */}
          <div className="w-12 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-center text-xs font-semibold text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
            {activeCell}
          </div>

          {/* Formula bar input */}
          <div className="flex flex-1 items-center rounded border border-neutral-300 bg-white px-2 py-0.5 dark:border-neutral-700 dark:bg-neutral-800">
            <span className="mr-1.5 text-xs font-serif italic text-neutral-400">
              fx
            </span>
            <input
              type="text"
              value={cells[activeCell] || ''}
              onChange={(e) => updateCellValue(activeCell, e.target.value)}
              disabled={readOnly}
              placeholder="Value or formula (=SUM(A1:A4), =A1*1.2)"
              className="w-full bg-transparent text-xs text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={addRow}
                title="Add Row"
                className="flex items-center gap-0.5 rounded px-1.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Plus size={11} /> Row
              </button>
              <button
                type="button"
                onClick={addColumn}
                title="Add Column"
                className="flex items-center gap-0.5 rounded px-1.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Plus size={11} /> Col
              </button>
              <button
                type="button"
                onClick={removeRow}
                title="Remove Last Row"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-red-500 dark:hover:bg-neutral-800"
              >
                <Trash2 size={11} /> Row
              </button>
              <button
                type="button"
                onClick={removeColumn}
                title="Remove Last Column"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-red-500 dark:hover:bg-neutral-800"
              >
                <Trash2 size={11} /> Col
              </button>
            </>
          )}
          <button
            type="button"
            onClick={exportCSV}
            title="Download CSV"
            className="flex items-center gap-1 rounded bg-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <Download size={11} /> CSV
          </button>
        </div>
      </div>

      {/* Grid container */}
      <div
        className="flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-900"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <table className="border-collapse text-xs table-fixed">
          <thead>
            <tr className="sticky top-0 z-10 bg-neutral-200 dark:bg-neutral-800">
              <th className="w-10 border border-neutral-300 bg-neutral-200 p-1 text-center font-mono text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                #
              </th>
              {Array.from({ length: numCols }).map((_, c) => {
                const colLabel = getColLetter(c);
                return (
                  <th
                    key={colLabel}
                    className="w-28 min-w-[100px] border border-neutral-300 bg-neutral-200 p-1 text-center font-mono text-[11px] font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {colLabel}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numRows }).map((_, r) => {
              const rowNum = r + 1;
              return (
                <tr key={rowNum} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50">
                  <td className="sticky left-0 border border-neutral-300 bg-neutral-200 p-1 text-center font-mono text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                    {rowNum}
                  </td>
                  {Array.from({ length: numCols }).map((_, c) => {
                    const colLabel = getColLetter(c);
                    const cellKey = `${colLabel}${rowNum}`;
                    const rawVal = cells[cellKey] ?? '';
                    const displayVal = evaluateCell(cellKey);
                    const isSelected = activeCell === cellKey;
                    const isEditing = editingCell === cellKey;

                    return (
                      <td
                        key={cellKey}
                        onClick={() => {
                          setActiveCell(cellKey);
                        }}
                        onDoubleClick={() => {
                          if (!readOnly) setEditingCell(cellKey);
                        }}
                        className={`h-7 border border-neutral-300 bg-white px-2 py-1 text-left align-middle text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 ${
                          isSelected
                            ? 'ring-2 ring-inset ring-brand'
                            : ''
                        }`}
                      >
                        {isEditing && !readOnly ? (
                          <input
                            autoFocus
                            type="text"
                            value={rawVal}
                            onChange={(e) => updateCellValue(cellKey, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setEditingCell(null);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="h-full w-full bg-transparent p-0 text-xs text-neutral-900 outline-none dark:text-neutral-100"
                          />
                        ) : (
                          <div
                            className={`truncate ${
                              typeof displayVal === 'number'
                                ? 'text-right font-mono'
                                : String(rawVal).startsWith('=')
                                ? 'font-medium text-brand dark:text-indigo-400'
                                : ''
                            }`}
                            title={String(displayVal)}
                          >
                            {String(displayVal)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div
        className="flex shrink-0 items-center justify-between border-t border-neutral-200 bg-neutral-50 px-3 py-1 text-[10px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span className="flex items-center gap-1">
          <Calculator size={11} /> Supports =SUM, =AVG, =COUNT, =A1+B1
        </span>
        <span>
          {numRows} rows × {numCols} cols
        </span>
      </div>
    </div>
  );
}
