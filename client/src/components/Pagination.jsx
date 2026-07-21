import React from 'react';

export function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="rounded border border-border bg-surface px-3 py-1 text-[13px] font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-[13px] font-semibold text-ink-700">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="rounded border border-border bg-surface px-3 py-1 text-[13px] font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
