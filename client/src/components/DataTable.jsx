import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

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
// server-side paging: pass { page, pageSize, total, onPageChange,
// onPageSizeChange? } and `rows` is treated as already being just the
// current page's rows (the caller's fetch is responsible for actually
// requesting that page — see e.g. useLearnersPage). This is what
// large/growing rosters (Students, Teachers, Staff, Guardians) use so a
// page load only pulls the ~10 rows it's about to show instead of the
// entire table every time.
//
// `actions` (optional): (row) => [{ key, label, icon, onClick, variant,
// hidden, disabled, confirm }] — a first-class, per-row action list
// instead of hand-rolling an "actions" column. Renders as an inline button
// row on desktop and a kebab (⋮) menu everywhere on mobile (compact and
// card layouts alike), so actions are never silently dropped on small
// screens the way a manually-added, un-flagged "actions" column used to
// be. `variant: 'danger'` colors the action red; pass `confirm: 'Delete
// this record?'` (a string) to route the click through the shared
// <ConfirmDialog /> instead of firing immediately.
//
// `filters` (optional): { search?: { value, onChange, placeholder,
// debounceMs }, fields?: [{ key, type: 'select'|'date'|'dateRange', label,
// value, onChange, options, fromValue, toValue, onFromChange, onToChange
// }], onClear?, hasActiveFilters? } — a declarative filter bar rendered
// above the table, for pages happy with the standard search+field-list
// shape. Pages with meaningfully different filter behavior (e.g. an
// explicit "Search now"/"Clear" apply step instead of live filtering) can
// keep rendering their own bar and simply not pass this prop.
//
// `sort`/`onSortChange` (optional): mark a column `sortable: true` (and
// optionally `sortValue: (row) => primitive` if the sort key isn't just
// `row[col.key]`) to get a clickable, indicator-arrow header. If the
// caller passes `sort={{ key, dir }}` + `onSortChange={(key) => ...}` the
// component is controlled — required for server-paginated tables, since
// otherwise a click would only reorder the current page's rows, not the
// whole result set. Without those props sorting is uncontrolled: the
// component keeps its own { key, dir } state and sorts `rows` itself,
// which is correct for the common case (client-side pagination or an
// unpaginated list) where `rows` is already the complete data set.
export function DataTable({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No records found.',
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100, 'all'],
  mobileCompact = false,
  serverPagination = null,
  rowClassName,
  onRowClick,
  actions,
  filters,
  sort: controlledSort,
  onSortChange
}) {
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(pageSize);
  const [internalSort, setInternalSort] = useState(null); // { key, dir }
  const [confirmAction, setConfirmAction] = useState(null); // { row, action }

  const sort = controlledSort !== undefined ? controlledSort : internalSort;

  function handleSortClick(col) {
    if (!col.sortable) return;
    if (onSortChange) return onSortChange(col.key);
    setInternalSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: 'asc' };
      if (prev.dir === 'asc') return { key: col.key, dir: 'desc' };
      return null; // third click clears sort
    });
  }

  // Client-side sort — only applies when the caller isn't already handling
  // it server-side (controlled sort + serverPagination means `rows` is
  // pre-sorted by the caller's fetch).
  const sortedRows = useMemo(() => {
    if (!sort || onSortChange) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const getValue = col.sortValue || ((row) => row[col.key]);
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
    });
    if (sort.dir === 'desc') copy.reverse();
    return copy;
  }, [rows, sort, columns, onSortChange]);

  const effectivePageSize = serverPagination ? serverPagination.pageSize : internalPageSize;
  const isEmpty = serverPagination ? serverPagination.total === 0 : rows.length === 0;

  const currentPage = serverPagination ? serverPagination.page : internalPage;
  const totalCount = serverPagination ? serverPagination.total : sortedRows.length;
  const totalPages = effectivePageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalCount / effectivePageSize));
  const startIndex = (currentPage - 1) * (effectivePageSize === 'all' ? totalCount : effectivePageSize);
  const paginatedRows = serverPagination
    ? sortedRows
    : effectivePageSize === 'all'
      ? sortedRows
      : sortedRows.slice(startIndex, startIndex + effectivePageSize);

  function goToPage(page) {
    const clamped = Math.max(1, Math.min(totalPages, page));
    if (serverPagination) serverPagination.onPageChange(clamped);
    else setInternalPage(clamped);
  }

  function changePageSize(newSize) {
    if (serverPagination) {
      if (serverPagination.onPageSizeChange) serverPagination.onPageSizeChange(newSize);
    } else {
      setInternalPageSize(newSize);
      setInternalPage(1);
    }
  }

  function runAction(row, action) {
    if (action.disabled) return;
    if (action.confirm) {
      setConfirmAction({ row, action });
      return;
    }
    action.onClick(row);
  }

  const [primaryColumn, ...restColumns] = columns;

  return (
    <>
      {filters && <FilterBar filters={filters} />}

      {isEmpty ? (
        <div className="p-10 text-center text-[13.5px] text-ink-500">{emptyMessage}</div>
      ) : (
        <>
          {/* Mobile view. Compact mode (used by rosters that link out to a full
              profile/detail page) shows just the primary column + a chevron in
              a flat navigable list — the rest of a row's data lives on that
              detail page instead of being crammed into the list. Non-compact
              rosters (no detail page to drill into) keep every column visible
              as a self-contained card, since there's nowhere else for that
              data or its row actions to go. Row actions (if any) render as a
              kebab menu in both layouts so they're never dropped on mobile. */}
          {mobileCompact ? (
            <div className="overflow-hidden rounded border border-border bg-surface md:hidden">
              {paginatedRows.map((row, i) => {
                const extraCols = restColumns.filter((c) => c.mobileCompact);
                const rowActions = actions ? actions(row).filter((a) => !a.hidden) : [];
                return (
                  <div
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`flex items-center gap-2 px-4 py-3 ${i > 0 ? 'border-t border-surface-muted' : ''} ${onRowClick ? 'cursor-pointer active:bg-surface-muted' : ''} ${rowClassName ? rowClassName(row) : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium text-ink-900">{primaryColumn.render(row)}</div>
                      {extraCols.length > 0 && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {extraCols.map((col) => (
                            <span key={col.key}>{col.render(row)}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {rowActions.length > 0 ? (
                      <ActionsKebab row={row} rowActions={rowActions} runAction={runAction} />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 text-ink-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 md:hidden">
              {paginatedRows.map((row) => {
                const rowActions = actions ? actions(row).filter((a) => !a.hidden) : [];
                return (
                  <div key={rowKey(row)} className={`rounded border border-border p-3 ${rowClassName ? rowClassName(row) : 'bg-surface'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[14px] font-semibold leading-snug text-ink-900">{primaryColumn.render(row)}</div>
                      {rowActions.length > 0 && <ActionsKebab row={row} rowActions={rowActions} runAction={runAction} />}
                    </div>
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
                );
              })}
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
                      onClick={() => handleSortClick(col)}
                      className={`border-b border-surface-muted bg-surface-muted px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-ink-500 whitespace-nowrap ${col.sortable ? 'cursor-pointer select-none hover:text-ink-900' : ''}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        {col.sortable && (
                          sort?.key === col.key
                            ? (sort.dir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)
                            : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </span>
                    </th>
                  ))}
                  {actions && <th className="border-b border-surface-muted bg-surface-muted px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-ink-500" />}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => {
                  const rowActions = actions ? actions(row).filter((a) => !a.hidden) : [];
                  return (
                    <tr key={rowKey(row)} className={`transition-colors hover:bg-surface-muted/60 ${rowClassName ? rowClassName(row) : ''}`}>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className="border-b border-surface-muted px-5 py-3.5 align-middle text-[14px] text-ink-900 last:border-b-0 whitespace-nowrap"
                        >
                          {col.render(row)}
                        </td>
                      ))}
                      {actions && (
                        <td className="border-b border-surface-muted px-5 py-3.5 align-middle text-[14px] text-ink-900 last:border-b-0 whitespace-nowrap">
                          <div className="flex justify-end gap-3">
                            {rowActions.map((action) => (
                              <button
                                key={action.key || action.label}
                                type="button"
                                disabled={action.disabled}
                                onClick={() => runAction(row, action)}
                                className={`flex items-center gap-1 text-xs font-semibold disabled:opacity-50 ${
                                  action.variant === 'danger' ? 'text-danger hover:opacity-80' : 'text-ink-500 hover:text-ink-900'
                                }`}
                              >
                                {action.icon && <action.icon className="h-3.5 w-3.5" />}
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-surface-muted bg-surface px-5 py-3.5 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="text-[12px] text-ink-500">
                {effectivePageSize === 'all' ? (
                  <>Showing all <span className="font-semibold text-ink-700">{totalCount}</span></>
                ) : (
                  <>
                    Showing <span className="font-semibold text-ink-700">{totalCount === 0 ? 0 : Math.min(startIndex + 1, totalCount)}</span>–
                    <span className="font-semibold text-ink-700">{Math.min(startIndex + effectivePageSize, totalCount)}</span> of{' '}
                    <span className="font-semibold text-ink-700">{totalCount}</span>
                  </>
                )}
              </div>
              {pageSizeOptions.length > 1 && (
                <label className="flex items-center gap-1.5 text-[12px] text-ink-500">
                  Show
                  <select
                    value={String(effectivePageSize)}
                    onChange={(e) => changePageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="rounded border border-border bg-surface px-1.5 py-1 text-[12px] font-semibold text-ink-700"
                  >
                    {pageSizeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-surface transition-colors"
                >
                  ← Previous
                </button>
                <div className="flex items-center gap-1">
                  {paginationWindow(currentPage, totalPages).map((entry, i) =>
                    entry === '…' ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-[12px] text-ink-400">…</span>
                    ) : (
                      <button
                        key={entry}
                        onClick={() => goToPage(entry)}
                        className={`h-8 w-8 rounded text-[12px] font-semibold transition-colors ${
                          entry === currentPage
                            ? 'bg-accent text-accent-ink hover:bg-accent-dark'
                            : 'border border-border bg-surface text-ink-700 hover:bg-surface-muted'
                        }`}
                      >
                        {entry}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-surface transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.action.confirm}
          confirmLabel={confirmAction.action.confirmLabel || 'Confirm'}
          danger={confirmAction.action.variant === 'danger'}
          onConfirm={() => {
            confirmAction.action.onClick(confirmAction.row);
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}

// Windowed page-number list with '…' gaps — always shows first, last, the
// current page, and one neighbor on each side, instead of one button per
// page (which was the original bug: a 408-row roster at 20/page rendered
// 21 unbroken number buttons).
function paginationWindow(current, total) {
  const delta = 1;
  const range = [];
  const rangeWithDots = [];
  let last;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (last) {
      if (i - last === 2) rangeWithDots.push(last + 1);
      else if (i - last > 2) rangeWithDots.push('…');
    }
    rangeWithDots.push(i);
    last = i;
  }

  return rangeWithDots;
}

function ActionsKebab({ row, rowActions, runAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-surface-muted"
        aria-label="Row actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-40 rounded-lg border border-border bg-surface p-1 shadow-xl">
          {rowActions.map((action) => (
            <button
              key={action.key || action.label}
              type="button"
              disabled={action.disabled}
              onClick={() => {
                setOpen(false);
                runAction(row, action);
              }}
              className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium hover:bg-surface-muted disabled:opacity-50 ${
                action.variant === 'danger' ? 'text-danger' : 'text-ink-700'
              }`}
            >
              {action.icon && <action.icon className="h-3.5 w-3.5" />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBar({ filters }) {
  const { search, fields, onClear, hasActiveFilters } = filters;
  const [searchInput, setSearchInput] = useState(search?.value ?? '');

  useEffect(() => {
    setSearchInput(search?.value ?? '');
  }, [search?.value]);

  useEffect(() => {
    if (!search) return;
    const timeout = setTimeout(() => {
      if (searchInput !== search.value) search.onChange(searchInput);
    }, search.debounceMs ?? 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      {search && (
        <label className="min-w-[200px] flex-1">
          <div className="mb-1 text-xs font-semibold text-ink-700">Search</div>
          <input
            className="input"
            placeholder={search.placeholder || 'Search…'}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
      )}
      {(fields || []).map((field) => (
        <FilterField key={field.key} field={field} />
      ))}
      {hasActiveFilters && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="rounded border border-border px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-surface-muted"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function FilterField({ field }) {
  if (field.type === 'select') {
    return (
      <label className="w-[160px]">
        <div className="mb-1 text-xs font-semibold text-ink-700">{field.label}</div>
        <select className="input" value={field.value} onChange={(e) => field.onChange(e.target.value)}>
          <option value="">{field.allLabel || 'All'}</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'date') {
    return (
      <label className="w-[160px]">
        <div className="mb-1 text-xs font-semibold text-ink-700">{field.label}</div>
        <input type="date" className="input" value={field.value} onChange={(e) => field.onChange(e.target.value)} />
      </label>
    );
  }

  if (field.type === 'dateRange') {
    return (
      <div>
        <div className="mb-1 text-xs font-semibold text-ink-700">{field.label}</div>
        <div className="flex items-center gap-2">
          <input type="date" className="input" value={field.fromValue} onChange={(e) => field.onFromChange(e.target.value)} />
          <span className="text-xs text-ink-500">to</span>
          <input type="date" className="input" value={field.toValue} onChange={(e) => field.onToChange(e.target.value)} />
        </div>
      </div>
    );
  }

  return null;
}
