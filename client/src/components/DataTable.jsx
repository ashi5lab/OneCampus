import { useState } from 'react';

// Generic table chrome (per OneCampus_App_Specification.md Part 15 — table
// density/style is shared across all three themes). Callers supply columns
// with a render function per cell; this component owns none of the data.
//
// The first column is treated as each row's "identity" on mobile (shown
// unlabeled, larger, at the top of its card) — every roster page in this
// app puts the record's name/title there first (Students, Teachers,
// Classes, ...), so this reads naturally everywhere without each page
// needing to say so explicitly. A column with no header (the common
// convention for an actions column, `header: ''`) renders without a label
// row too, rather than a blank uppercase chip next to it.
//
// `serverPagination` (optional) switches from the default client-side
// slicing (fetch everything, page through it in memory — fine for small,
// bounded lists like a single day's attendance or a cohort roster) to
// server-side paging: pass { page, pageSize, total, onPageChange } and
// `rows` is treated as already being just the current page's rows (the
// caller's fetch is responsible for actually requesting that page — see
// e.g. useLearnersPage). This is what large/growing rosters (Students,
// Teachers, Staff, Guardians) use so a page load only pulls the ~10 rows
// it's about to show instead of the entire table every time.
export function DataTable({ columns, rows, rowKey, emptyMessage = 'No records found.', pageSize = 10, mobileCompact = false, serverPagination = null }) {
  const [internalPage, setInternalPage] = useState(1);

  const isEmpty = serverPagination ? serverPagination.total === 0 : rows.length === 0;
  if (isEmpty) {
    return <div className="p-10 text-center text-[13.5px] text-ink-500">{emptyMessage}</div>;
  }

  const currentPage = serverPagination ? serverPagination.page : internalPage;
  const effectivePageSize = serverPagination ? serverPagination.pageSize : pageSize;
  const totalCount = serverPagination ? serverPagination.total : rows.length;
  const totalPages = Math.ceil(totalCount / effectivePageSize);
  const startIndex = (currentPage - 1) * effectivePageSize;
  const paginatedRows = serverPagination ? rows : rows.slice(startIndex, startIndex + effectivePageSize);

  const handlePrev = () =>
    serverPagination ? serverPagination.onPageChange(Math.max(1, currentPage - 1)) : setInternalPage((p) => Math.max(1, p - 1));
  const handleNext = () =>
    serverPagination
      ? serverPagination.onPageChange(Math.min(totalPages, currentPage + 1))
      : setInternalPage((p) => Math.min(totalPages, p + 1));

  const [primaryColumn, ...restColumns] = columns;

  return (
    <>
      {/* Mobile view. Compact mode (used by rosters that link out to a full
          profile/detail page) shows just the primary column + a chevron in
          a flat navigable list — the rest of a row's data lives on that
          detail page instead of being crammed into the list. Non-compact
          rosters (no detail page to drill into) keep every column visible
          as a self-contained card, since there's nowhere else for that
          data or its row actions to go. */}
      {mobileCompact ? (
        <div className="overflow-hidden rounded border border-border bg-surface md:hidden">
          {paginatedRows.map((row, i) => (
            <div key={rowKey(row)} className={`flex items-center gap-2 px-4 py-3 ${i > 0 ? 'border-t border-surface-muted' : ''}`}>
              <div className="min-w-0 flex-1 text-[14px] font-medium text-ink-900">{primaryColumn.render(row)}</div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 text-ink-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 md:hidden">
          {paginatedRows.map((row) => (
            <div key={rowKey(row)} className="rounded border border-border bg-surface p-3">
              <div className="text-[14px] font-semibold leading-snug text-ink-900">{primaryColumn.render(row)}</div>
              {restColumns.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-surface-muted pt-3">
                  {restColumns.map((col) => (
                    <div key={col.key} className="flex items-center justify-between gap-3">
                      {col.header && (
                        <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-500">{col.header}</span>
                      )}
                      <div className={col.header ? 'text-right text-[13.5px] text-ink-900' : 'flex-1 text-[13.5px] text-ink-900'}>
                        {col.render(row)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Desktop view */}
      <div className="hidden w-full overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-surface-muted bg-surface-muted px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-ink-500 whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-surface-muted/60">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="border-b border-surface-muted px-5 py-3.5 align-middle text-[14px] text-ink-900 last:border-b-0 whitespace-nowrap"
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
      {totalPages > 1 && (
        <div className="border-t border-surface-muted bg-surface px-5 py-3.5">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-[12px] text-ink-500">
              Showing <span className="font-semibold text-ink-700">{Math.min(startIndex + 1, totalCount)}</span>–
              <span className="font-semibold text-ink-700">{Math.min(startIndex + effectivePageSize, totalCount)}</span> of{' '}
              <span className="font-semibold text-ink-700">{totalCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentPage === 1}
                className="rounded border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-surface transition-colors"
              >
                ← Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  const isActive = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() =>
                        serverPagination ? serverPagination.onPageChange(pageNum) : setInternalPage(pageNum)
                      }
                      className={`h-8 w-8 rounded text-[12px] font-semibold transition-colors ${
                        isActive
                          ? 'bg-accent text-accent-ink hover:bg-accent-dark'
                          : 'border border-border bg-surface text-ink-700 hover:bg-surface-muted'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className="rounded border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-surface transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
