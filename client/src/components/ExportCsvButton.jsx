import { Download } from 'lucide-react';
import { downloadCsv } from '../lib/csvExport';

// Small, consistent "Export CSV" affordance for report tables — sits next
// to a DataTable's filter bar. `columns`/`rows` mirror downloadCsv()'s
// plain-text projection (see lib/csvExport.js for why it's separate from
// DataTable's JSX-rendering columns).
export function ExportCsvButton({ filename, columns, rows, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled || rows.length === 0}
      onClick={() => downloadCsv(filename, columns, rows)}
      className="flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-40"
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </button>
  );
}
