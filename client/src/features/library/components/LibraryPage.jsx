import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useBooks, useLoans, useCreateBook, useUpdateBook, useDeleteBook, useReturnLoan } from '../hooks/useLibrary';
import { BookFormModal } from './BookFormModal';
import { IssueLoanModal } from './IssueLoanModal';

const TABS = [
  { value: 'catalog', label: 'Catalog' },
  { value: 'loans', label: 'Loans' }
];

export function LibraryPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState('catalog');
  const [showAddBook, setShowAddBook] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [issuingBook, setIssuingBook] = useState(null);

  const { data: books, isLoading: booksLoading, error: booksError } = useBooks();
  const { data: loans, isLoading: loansLoading, error: loansError } = useLoans();
  const createBook = useCreateBook();
  const updateBook = useUpdateBook();
  const deleteBook = useDeleteBook();
  const returnLoan = useReturnLoan();

  const bookColumns = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <div>
          <div className="font-semibold">{row.title}</div>
          <div className="text-[11.5px] text-ink-500">{row.author || '—'}</div>
        </div>
      )
    },
    { key: 'category', header: 'Category', render: (row) => row.category || '—' },
    {
      key: 'copies',
      header: 'Available',
      render: (row) => (
        <Badge variant={row.available_copies > 0 ? 'active' : 'inactive'}>
          {row.available_copies} / {row.total_copies}
        </Badge>
      )
    }
  ];
  if (can('library.manage')) {
    bookColumns.push({
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-3">
          {row.available_copies > 0 && (
            <button onClick={() => setIssuingBook(row)} className="text-xs font-semibold text-accent-dark hover:underline">
              Issue
            </button>
          )}
          <button onClick={() => setEditingBook(row)} className="text-xs font-semibold text-ink-500 hover:text-ink-900">
            Edit
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete "${row.title}"?`)) deleteBook.mutate(row.id);
            }}
            className="text-xs font-semibold text-danger hover:opacity-80"
          >
            Delete
          </button>
        </div>
      )
    });
  }

  const loanColumns = [
    { key: 'book', header: 'Book', render: (row) => row.book_title },
    { key: 'borrower', header: 'Borrower', render: (row) => `${row.borrower_username} (${row.borrower_role})` },
    { key: 'due', header: 'Due', render: (row) => new Date(row.due_date).toLocaleDateString() },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.returned_date ? (
          <Badge variant="active">Returned {new Date(row.returned_date).toLocaleDateString()}</Badge>
        ) : (
          <Badge variant={new Date(row.due_date) < new Date() ? 'inactive' : 'pending'}>Out</Badge>
        )
    }
  ];
  if (can('library.manage')) {
    loanColumns.push({
      key: 'actions',
      header: '',
      render: (row) =>
        !row.returned_date && (
          <button
            onClick={() => returnLoan.mutate(row.id)}
            className="text-xs font-semibold text-accent-dark hover:underline"
          >
            Mark Returned
          </button>
        )
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Library</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Library</h1>
        </div>
        {tab === 'catalog' && can('library.manage') && (
          <button
            onClick={() => setShowAddBook(true)}
            className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Add Book
          </button>
        )}
      </div>

      <div className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === t.value ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'catalog' && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Titles" value={booksLoading ? '—' : books.length} />
          </div>
          <div className="overflow-hidden rounded border border-border bg-surface">
            {booksLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
            {booksError && <div className="p-8 text-center text-sm font-semibold text-danger">{booksError.message}</div>}
            {books && <DataTable columns={bookColumns} rows={books} rowKey={(row) => row.id} />}
          </div>
        </>
      )}

      {tab === 'loans' && (
        <div className="overflow-hidden rounded border border-border bg-surface">
          {loansLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
          {loansError && <div className="p-8 text-center text-sm font-semibold text-danger">{loansError.message}</div>}
          {loans && (
            <DataTable columns={loanColumns} rows={loans} rowKey={(row) => row.id} emptyMessage="No loans yet." />
          )}
        </div>
      )}

      {showAddBook && (
        <BookFormModal
          onClose={() => setShowAddBook(false)}
          submitting={createBook.isPending}
          submitError={createBook.error?.message}
          onSubmit={(values) => createBook.mutate(values, { onSuccess: () => setShowAddBook(false) })}
        />
      )}

      {editingBook && (
        <BookFormModal
          initialData={editingBook}
          onClose={() => setEditingBook(null)}
          submitting={updateBook.isPending}
          submitError={updateBook.error?.message}
          onSubmit={(values) =>
            updateBook.mutate({ id: editingBook.id, payload: values }, { onSuccess: () => setEditingBook(null) })
          }
        />
      )}

      {issuingBook && <IssueLoanModal book={issuingBook} onClose={() => setIssuingBook(null)} />}
    </div>
  );
}
