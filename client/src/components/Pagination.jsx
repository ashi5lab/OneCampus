import React, { useState } from 'react';

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems = null,
  pageSize = 10,
  onPageSizeChange = null,
  showInfo = true,
}) {
  if (totalPages <= 1 && !onPageSizeChange) return null;

  // Calculate visible page numbers (show up to 5 page buttons)
  const getPageNumbers = () => {
    const maxVisible = 5;
    const pages = [];

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (end < totalPages - 1) pages.push('...');

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      {showInfo && totalItems && (
        <div className="text-[12px] text-ink-500">
          Showing <span className="font-semibold text-ink-700">{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</span>–
          <span className="font-semibold text-ink-700">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
          <span className="font-semibold text-ink-700">{totalItems}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="rounded border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-surface transition-colors"
        >
          ← Previous
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-[12px] text-ink-500">
                  …
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`h-8 w-8 rounded text-[12px] font-semibold transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-ink hover:bg-accent-dark'
                    : 'border border-border bg-surface text-ink-700 hover:bg-surface-muted'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="rounded border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-surface transition-colors"
        >
          Next →
        </button>
      </div>

      {/* Page size selector */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-[12px] font-medium text-ink-700">
            Items per page:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded border border-border bg-surface px-2 py-1.5 text-[12px] font-semibold text-ink-700 hover:bg-surface-muted"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      )}
    </div>
  );
}
