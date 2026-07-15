import { useState } from 'react';

// Generic table chrome (per OneCampus_App_Specification.md Part 15 — table
// density/style is shared across all three themes). Callers supply columns
// with a render function per cell; this component owns none of the data.
export function DataTable({ columns, rows, rowKey, emptyMessage = 'No records found.', pageSize = 10 }) {
  const [currentPage, setCurrentPage] = useState(1);

  if (rows.length === 0) {
    return <div className="p-8 text-center text-sm text-ink-500">{emptyMessage}</div>;
  }

  const totalPages = Math.ceil(rows.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize);

  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
    <>
      {/* Mobile view (cards) */}
      <div className="grid grid-cols-1 md:hidden">
        {paginatedRows.map((row) => (
          <div key={rowKey(row)} className="border-b border-surface-muted p-4 last:border-0 bg-surface">
            {columns.map((col) => (
              <div key={col.key} className="mb-2 flex flex-col last:mb-0">
                <span className="text-[10px] font-bold uppercase tracking-wide text-ink-500">
                  {col.header}
                </span>
                <div className="mt-1 text-[13.5px] text-ink-900">
                  {col.render(row)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Desktop view (table) */}
      <div className="hidden w-full overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-surface-muted bg-surface-muted px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-ink-500 whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="border-b border-surface-muted px-5 py-3 align-middle text-[13.5px] text-ink-900 last:border-b-0 whitespace-nowrap"
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t border-surface-muted bg-surface px-5 py-3">
        <div className="text-[11.5px] text-ink-500">
          Showing <span className="font-semibold text-ink-700">{Math.min(startIndex + 1, rows.length)}</span> to <span className="font-semibold text-ink-700">{Math.min(startIndex + pageSize, rows.length)}</span> of <span className="font-semibold text-ink-700">{rows.length}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrev}
            disabled={currentPage === 1}
            className="rounded border border-border bg-surface px-3 py-1.5 text-[11.5px] font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-50 disabled:hover:bg-surface"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages || totalPages === 0}
            className="rounded border border-border bg-surface px-3 py-1.5 text-[11.5px] font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-50 disabled:hover:bg-surface"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
