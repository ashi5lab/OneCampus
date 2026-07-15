import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useLibraryReport } from '../hooks/useReports';

export function LibraryTab() {
  const { data, isLoading, error } = useLibraryReport();

  const bookColumns = [
    { key: 'title', header: 'Title', render: (row) => row.title },
    { key: 'author', header: 'Author', render: (row) => row.author || '—' },
    { key: 'copies', header: 'Copies', render: (row) => `${row.available_copies} / ${row.total_copies}` },
    { key: 'borrowed', header: 'Times Borrowed', render: (row) => row.times_borrowed }
  ];

  const overdueColumns = [
    { key: 'book', header: 'Book', render: (row) => row.book_title },
    { key: 'borrower', header: 'Borrower', render: (row) => row.borrower_username },
    { key: 'due', header: 'Due Date', render: (row) => new Date(row.due_date).toLocaleDateString() },
    { key: 'overdue', header: 'Days Overdue', render: (row) => <Badge variant="inactive">{row.days_overdue}</Badge> }
  ];

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Overdue Loans</div>
        <div className="overflow-hidden rounded border border-border bg-surface">
          <DataTable columns={overdueColumns} rows={data.overdueLoans} rowKey={(row) => row.id} emptyMessage="No overdue loans." />
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Catalog — Most Borrowed</div>
        <div className="overflow-hidden rounded border border-border bg-surface">
          <DataTable columns={bookColumns} rows={data.books} rowKey={(row) => row.id} emptyMessage="No books in the catalog." />
        </div>
      </div>
    </div>
  );
}
