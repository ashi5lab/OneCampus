import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { Badge } from '../../../components/Badge';
import { useLibraryReport } from '../hooks/useReports';

export function LibraryTab() {
  const { data, isLoading, error } = useLibraryReport();
  const [search, setSearch] = useState('');

  const bookColumns = [
    { key: 'title', header: 'Title', sortable: true, render: (row) => row.title },
    { key: 'author', header: 'Author', sortable: true, render: (row) => row.author || '—' },
    { key: 'copies', header: 'Copies', render: (row) => `${row.available_copies} / ${row.total_copies}` },
    { key: 'borrowed', header: 'Times Borrowed', sortable: true, render: (row) => row.times_borrowed }
  ];

  const overdueColumns = [
    { key: 'book', header: 'Book', sortable: true, render: (row) => row.book_title },
    { key: 'borrower', header: 'Borrower', sortable: true, render: (row) => row.borrower_username },
    { key: 'due', header: 'Due Date', sortable: true, sortValue: (row) => row.due_date, render: (row) => new Date(row.due_date).toLocaleDateString() },
    { key: 'overdue', header: 'Days Overdue', sortable: true, sortValue: (row) => row.days_overdue, render: (row) => <Badge variant="inactive">{row.days_overdue}</Badge> }
  ];

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  const books = search ? data.books.filter((b) => b.title?.toLowerCase().includes(search.toLowerCase())) : data.books;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wide text-ink-500">Overdue Loans</div>
          <ExportCsvButton
            filename="library-overdue-loans"
            columns={[
              { header: 'Book', value: (r) => r.book_title },
              { header: 'Borrower', value: (r) => r.borrower_username },
              { header: 'Due Date', value: (r) => r.due_date },
              { header: 'Days Overdue', value: (r) => r.days_overdue }
            ]}
            rows={data.overdueLoans}
          />
        </div>
        <div className="overflow-hidden bg-surface md:rounded border-0 md:border border-border -mx-4 md:mx-0">
          <DataTable columns={overdueColumns} rows={data.overdueLoans} rowKey={(row) => row.id} emptyMessage="No overdue loans." />
        </div>
      </div>
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold uppercase tracking-wide text-ink-500">Catalog — Most Borrowed</div>
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Search title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-48"
            />
            <ExportCsvButton
              filename="library-catalog"
              columns={[
                { header: 'Title', value: (r) => r.title },
                { header: 'Author', value: (r) => r.author || '' },
                { header: 'Copies', value: (r) => `${r.available_copies} / ${r.total_copies}` },
                { header: 'Times Borrowed', value: (r) => r.times_borrowed }
              ]}
              rows={books}
            />
          </div>
        </div>
        <div className="overflow-hidden bg-surface md:rounded border-0 md:border border-border -mx-4 md:mx-0">
          <DataTable columns={bookColumns} rows={books} rowKey={(row) => row.id} emptyMessage="No books in the catalog." />
        </div>
      </div>
    </div>
  );
}
