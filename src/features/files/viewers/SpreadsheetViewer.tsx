import { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Table, Download, Search, AlertCircle } from 'lucide-react';

interface SpreadsheetViewerProps {
  blob: Blob;
  fileName: string;
}

export function SpreadsheetViewer({ blob, fileName }: SpreadsheetViewerProps) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function parseSpreadsheet() {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        if (active) {
          setWorkbook(wb);
          if (wb.SheetNames && wb.SheetNames.length > 0) {
            setActiveSheetName(wb.SheetNames[0]);
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Failed to read spreadsheet file.');
          setLoading(false);
        }
      }
    }

    void parseSpreadsheet();

    return () => {
      active = false;
    };
  }, [blob]);

  // Parse active sheet data into 2D array of string/any
  const rawSheetData = useMemo(() => {
    if (!workbook || !activeSheetName) return [];
    const worksheet = workbook.Sheets[activeSheetName];
    if (!worksheet) return [];
    return XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
  }, [workbook, activeSheetName]);

  // Filtered rows based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return rawSheetData;
    const q = searchQuery.toLowerCase();
    return rawSheetData.filter((row) =>
      row.some((cell: any) => String(cell).toLowerCase().includes(q)),
    );
  }, [rawSheetData, searchQuery]);

  // Generate column labels (A, B, C, ... AA, AB)
  const maxCols = useMemo(() => {
    return rawSheetData.reduce((max, row) => Math.max(max, row.length), 0);
  }, [rawSheetData]);

  const colHeaders = useMemo(() => {
    const headers: string[] = [];
    for (let i = 0; i < maxCols; i++) {
      let colName = '';
      let n = i;
      while (n >= 0) {
        colName = String.fromCharCode((n % 26) + 65) + colName;
        n = Math.floor(n / 26) - 1;
      }
      headers.push(colName);
    }
    return headers;
  }, [maxCols]);

  const handleDownload = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-neutral-950">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-white/90 px-4 py-2 text-xs backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/90">
        <div className="flex items-center gap-2">
          <Table size={15} className="text-emerald-500" />
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[180px]">
            {fileName}
          </span>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
            {fileName.endsWith('.csv') ? 'CSV' : 'XLSX'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex items-center">
            <Search size={12} className="absolute left-2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table..."
              className="h-7 w-32 sm:w-44 rounded-md border border-neutral-200 bg-neutral-50 pl-6 pr-2 text-xs text-neutral-800 outline-none transition focus:border-brand focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:border-brand"
            />
          </div>

          <span className="hidden sm:inline text-[11px] text-neutral-400">
            {filteredData.length} rows • {maxCols} cols
          </span>

          <button
            type="button"
            onClick={handleDownload}
            title="Download spreadsheet"
            className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <Download size={12} />
            Download
          </button>
        </div>
      </div>

      {/* Main Grid Body */}
      <div className="relative flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950">
        {loading && (
          <div className="flex h-64 items-center justify-center text-xs text-neutral-400">
            <span className="animate-pulse">Loading spreadsheet...</span>
          </div>
        )}

        {error && (
          <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle size={16} />
              Could not open spreadsheet
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

        {!loading && !error && filteredData.length === 0 && (
          <div className="flex h-64 items-center justify-center text-xs text-neutral-400">
            {searchQuery ? 'No matching rows found.' : 'Empty spreadsheet sheet.'}
          </div>
        )}

        {!loading && !error && filteredData.length > 0 && (
          <div className="min-w-full inline-block align-middle">
            <table className="border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-neutral-300 bg-neutral-200/90 text-neutral-600 backdrop-blur-xs dark:border-neutral-700 dark:bg-neutral-800/90 dark:text-neutral-400">
                  <th className="sticky left-0 z-20 w-12 border-r border-neutral-300 bg-neutral-300/80 px-2 py-1.5 text-center text-[10px] font-semibold dark:border-neutral-700 dark:bg-neutral-800">
                    #
                  </th>
                  {colHeaders.map((col, idx) => (
                    <th
                      key={idx}
                      className="border-r border-neutral-300 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider dark:border-neutral-700"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b border-neutral-200/80 transition-colors hover:bg-blue-50/50 dark:border-neutral-800/80 dark:hover:bg-blue-900/10"
                  >
                    <td className="sticky left-0 z-10 border-r border-neutral-200 bg-neutral-100/90 px-2 py-1.5 text-center text-[10px] text-neutral-400 select-none dark:border-neutral-800 dark:bg-neutral-900/90">
                      {rowIdx + 1}
                    </td>
                    {Array.from({ length: maxCols }).map((_, colIdx) => {
                      const cellVal = row[colIdx];
                      const displayVal =
                        cellVal !== undefined && cellVal !== null ? String(cellVal) : '';
                      const isNumber =
                        displayVal !== '' && !isNaN(Number(displayVal)) && !isNaN(parseFloat(displayVal));
                      return (
                        <td
                          key={colIdx}
                          className={`max-w-[280px] truncate border-r border-neutral-200/80 px-3 py-1.5 text-neutral-800 dark:border-neutral-800/80 dark:text-neutral-200 ${
                            isNumber ? 'text-right' : 'text-left'
                          }`}
                          title={displayVal}
                        >
                          {displayVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sheet Tabs Bar at Bottom (like real Excel) */}
      {workbook && workbook.SheetNames && workbook.SheetNames.length > 1 && (
        <div className="flex items-center gap-1 border-t border-neutral-200 bg-neutral-100 px-3 py-1.5 overflow-x-auto dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mr-1 select-none">
            Sheets:
          </span>
          {workbook.SheetNames.map((name) => {
            const isActive = name === activeSheetName;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setActiveSheetName(name)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  isActive
                    ? 'bg-white text-emerald-700 shadow-xs dark:bg-neutral-800 dark:text-emerald-400 font-semibold border-b-2 border-emerald-500'
                    : 'text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
