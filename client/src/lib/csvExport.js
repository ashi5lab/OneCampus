// Client-side CSV export for report tables — the data driving these tables
// is already fully loaded in the browser (small, bounded datasets: a
// single day, a cohort roster, a date-range summary), so there's no need
// to round-trip through the server the way downloadFile() does for
// generated PDFs/Excel exports elsewhere in the app.
//
// `columns`: [{ header, value: (row) => string|number }] — deliberately a
// separate, simpler shape than DataTable's columns (which render JSX, not
// plain text), so callers pass a small text-only projection alongside
// their DataTable columns rather than trying to stringify JSX.
function csvEscape(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function downloadCsv(filename, columns, rows) {
  const header = columns.map((c) => csvEscape(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => csvEscape(c.value(row))).join(','));
  const csv = [header, ...lines].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
