import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Copy, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { DataTable } from '../../../components/DataTable';
import { PageHeader } from '../../../components/PageHeader';
import { SearchSelect } from '../../../components/SearchSelect';
import { useExams, useDeleteExam, useDuplicateExam } from '../hooks/useExams';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { ExamStatusBadge, ExamPublishBadge } from './ExamStatusBadge';
import { showToast } from '../../../lib/toast';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'created', label: 'Scheduled' },
  { value: 'grading_in_progress', label: 'Grading In Progress' },
  { value: 'completed', label: 'Completed' },
];

export function ExamsPage() {
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
  const { data, isLoading, error } = useExams(filters);
  const { data: cohortsData } = useCohorts();

  const deleteExam = useDeleteExam();
  const duplicateExam = useDuplicateExam();

  const exams = data?.exams ?? [];
  const total = data?.total ?? 0;

  const cohortOptions = (cohortsData?.data ?? []).map(c => ({ value: String(c.id), label: c.name }));

  function handleDelete(row) {
    deleteExam.mutate(row.id, {
      onSuccess: () => showToast.success('Exam deleted.'),
      onError: (e) => showToast.error(e.message),
    });
  }

  function handleDuplicate(row) {
    duplicateExam.mutate(row.id, {
      onSuccess: () => showToast.success('Exam duplicated.'),
      onError: (e) => showToast.error(e.message),
    });
  }

  const columns = [
    {
      key: 'title',
      header: 'Exam Name',
      sortable: true,
      render: (row) => (
        <Link to={`/app/exams/${row.id}`} className="font-semibold text-accent-dark hover:underline">
          {row.title}
        </Link>
      ),
    },
    { key: 'subject', header: 'Subject', sortable: true, render: (row) => row.subject_name ?? '—' },
    { key: 'class', header: t('cohort'), render: (row) => row.class_names ?? '—' },
    {
      key: 'exam_date',
      header: 'Date',
      sortable: true,
      render: (row) => row.exam_date ? new Date(row.exam_date).toLocaleDateString() : '—',
    },
    { key: 'taken_by', header: 'Taken By', render: (row) => row.taken_by_name ?? '—' },
    { key: 'status', header: 'Status', sortable: true, mobileCompact: true, render: (row) => <ExamStatusBadge status={row.status} /> },
    { key: 'publish', header: 'Published', mobileCompact: true, render: (row) => <ExamPublishBadge published={row.publish_marks} /> },
  ];

  function examActions(row) {
    return [
      { key: 'edit', label: 'Edit', icon: Pencil, hidden: !can('exams.manage'), onClick: () => navigate(`/app/exams/${row.id}/edit`) },
      { key: 'duplicate', label: 'Duplicate', icon: Copy, hidden: !can('exams.manage'), onClick: () => handleDuplicate(row) },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'danger',
        hidden: !can('exams.manage'),
        confirm: `Delete "${row.title}"? This cannot be undone.`,
        onClick: () => handleDelete(row)
      }
    ];
  }

  return (
    <div>
      <PageHeader
        eyebrow="Exams"
        title="Exams"
        actions={
          can('exams.manage') && (
            <button
              onClick={() => navigate('/app/exams/new')}
              className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
            >
              + New Exam
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <input
          type="search"
          placeholder="Search exam name, subject, class…"
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
          rows={exams}
          rowKey={row => row.id}
          emptyMessage="No exams found."
          isLoading={isLoading}
          serverPagination={{ page, pageSize, total, onPageChange: setPage }}
          pageSizeOptions={[pageSize]}
          mobileCompact
          onRowClick={(row) => navigate(`/app/exams/${row.id}`)}
          actions={examActions}
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
