import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Copy, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { DataTable } from '../../../components/DataTable';
import { PageHeader } from '../../../components/PageHeader';
import { SearchSelect } from '../../../components/SearchSelect';
import { useAssignments, useDeleteAssignment, useDuplicateAssignment } from '../hooks/useAssignments';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { AssignmentStatusBadge, PublishBadge } from './AssignmentStatusBadge';
import { showToast } from '../../../lib/toast';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'created', label: 'Created' },
  { value: 'grading_in_progress', label: 'Grading In Progress' },
  { value: 'completed', label: 'Completed' },
];

export function AssignmentsPage() {
  const { can } = useAuth();
  const { t } = useConfig();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(null);
  const pageSize = 20;

  const filters = { search, cohort_id: cohortId || undefined, status: status || undefined, from_date: fromDate || undefined, to_date: toDate || undefined, page, page_size: pageSize, sort: sort?.key, order: sort?.dir };
  const { data, isLoading, error } = useAssignments(filters);
  const { data: cohortsData } = useCohorts();

  const deleteAssignment = useDeleteAssignment();
  const duplicateAssignment = useDuplicateAssignment();

  const assignments = data?.assignments ?? [];
  const total = data?.total ?? 0;

  const cohortOptions = (cohortsData?.data ?? []).map(c => ({ value: String(c.id), label: c.name }));

  function handleDelete(row) {
    deleteAssignment.mutate(row.id, {
      onSuccess: () => showToast.success('Assignment deleted.'),
      onError: (e) => showToast.error(e.message),
    });
  }

  function handleDuplicate(row) {
    duplicateAssignment.mutate(row.id, {
      onSuccess: () => showToast.success('Assignment duplicated.'),
      onError: (e) => showToast.error(e.message),
    });
  }

  const columns = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => (
        <Link to={`/app/assignments/${row.id}`} className="font-semibold text-accent-dark hover:underline">
          {row.title}
        </Link>
      ),
    },
    { key: 'subject', header: 'Subject', sortable: true, render: (row) => row.module_name ?? '—' },
    { key: 'class', header: t('cohort'), render: (row) => row.class_names ?? '—' },
    {
      key: 'due_date',
      header: 'Due',
      sortable: true,
      render: (row) => row.due_date ? new Date(row.due_date).toLocaleDateString() : '—',
    },
    { key: 'status', header: 'Status', mobileCompact: true, render: (row) => <AssignmentStatusBadge status={row.status} /> },
    { key: 'publish', header: 'Published', mobileCompact: true, render: (row) => <PublishBadge published={row.publish_marks} /> },
  ];

  // Row is already fully tappable (onRowClick below) and the title is a
  // Link, so "View" would be redundant here — only manage-gated actions.
  function assignmentActions(row) {
    return [
      { key: 'edit', label: 'Edit', icon: Pencil, hidden: !can('assignments.manage'), onClick: () => navigate(`/app/assignments/${row.id}/edit`) },
      { key: 'duplicate', label: 'Duplicate', icon: Copy, hidden: !can('assignments.manage'), onClick: () => handleDuplicate(row) },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'danger',
        hidden: !can('assignments.manage'),
        confirm: `Delete "${row.title}"? This cannot be undone.`,
        onClick: () => handleDelete(row)
      }
    ];
  }

  return (
    <div>
      <PageHeader
        eyebrow="Assignments"
        title="Homework & Assignments"
        actions={
          can('assignments.manage') && (
            <button
              onClick={() => navigate('/app/assignments/new')}
              className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
            >
              + New Assignment
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <input
          type="search"
          placeholder="Search title, subject, class…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="input w-full max-w-xs"
        />
        <div className="w-48">
          <SearchSelect
            options={[{ value: '', label: 'All Classes' }, ...cohortOptions]}
            value={cohortId}
            onChange={v => { setCohortId(v); setPage(1); }}
            placeholder="Filter by class"
          />
        </div>
        <div className="w-48">
          <SearchSelect
            options={STATUS_OPTIONS}
            value={status}
            onChange={v => { setStatus(v); setPage(1); }}
            placeholder="Filter by status"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setPage(1); }}
            className="input text-sm"
          />
          <span className="text-xs text-ink-500">to</span>
          <input
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setPage(1); }}
            className="input text-sm"
          />
        </div>
      </div>

      <div className="overflow-hidden bg-surface md:rounded border-0 md:border border-border -mx-4 md:mx-0">
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        <DataTable
          columns={columns}
          rows={assignments}
          rowKey={row => row.id}
          emptyMessage="No assignments found."
          isLoading={isLoading}
          serverPagination={{ page, pageSize, total, onPageChange: setPage }}
          pageSizeOptions={[pageSize]}
          mobileCompact
          onRowClick={(row) => navigate(`/app/assignments/${row.id}`)}
          actions={assignmentActions}
          sort={sort}
          onSortChange={(key) => setSort((prev) => {
            if (!prev || prev.key !== key) return { key, dir: 'asc' };
            if (prev.dir === 'asc') return { key, dir: 'desc' };
            return null;
          })}
        />
      </div>
    </div>
  );
}
