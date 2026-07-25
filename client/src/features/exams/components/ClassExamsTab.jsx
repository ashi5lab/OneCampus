import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { DataTable } from '../../../components/DataTable';
import { useExams } from '../hooks/useExams';
import { useMarkActivityContextViewed } from '../../activities/hooks/useActivities';

// The Class channel's Exams tab — filtered to this cohort, cohort column dropped.
export function ClassExamsTab({ cohortId }) {
  const { can } = useAuth();
  const { t } = useConfig();
  const { data, isLoading, error } = useExams();
  const exams = data?.exams ?? [];

  useMarkActivityContextViewed(`exams_${cohortId}`);

  const scoped = useMemo(
    () => (exams || []).filter((e) => (e.cohort_ids ?? []).includes(cohortId)),
    [exams, cohortId]
  );

  const columns = [
    {
      key: 'title',
      header: 'Exam Name',
      render: (row) => (
        <Link to={`/app/exams/${row.id}`} className="font-semibold text-accent-dark hover:underline">
          {row.title}
        </Link>
      )
    },
    { key: 'module', header: t('topic'), render: (row) => row.subject_name },
    { key: 'exam_date', header: 'Date', render: (row) => row.exam_date ? new Date(row.exam_date).toLocaleDateString() : '—' },
    { key: 'taken_by', header: 'Taken By', render: (row) => row.taken_by_name ?? '—' },
  ];

  return (
    <div>
      {can('exams.manage') && (
        <div className="mb-4 flex justify-end">
          <Link
            to="/app/exams/new"
            className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Schedule Exam
          </Link>
        </div>
      )}

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {!isLoading && !error && (
          <DataTable columns={columns} rows={scoped} rowKey={(row) => row.id} emptyMessage="No exams scheduled yet." />
        )}
      </div>

      {can('exams.manage') && (
        <Link to="/app/exams" className="mt-3 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900">
          Manage exams across all classes &rarr;
        </Link>
      )}
    </div>
  );
}
