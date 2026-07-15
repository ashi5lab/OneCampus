import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DataTable } from '../../../components/DataTable';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useModules } from '../../modules/hooks/useModules';
import { useEvaluation, useSchedules, useCreateSchedule } from '../hooks/useEvaluations';
import { ScheduleFormModal } from './ScheduleFormModal';

export function EvaluationDetailPage() {
  const { id } = useParams();
  const { t } = useConfig();
  const { can } = useAuth();
  const { data: evaluation } = useEvaluation(id);
  const { data: schedules, isLoading, error } = useSchedules(id);
  const { data: modules } = useModules();
  const createSchedule = useCreateSchedule(id);
  const [showForm, setShowForm] = useState(false);

  const moduleName = (moduleId) => (modules || []).find((m) => m.id === moduleId)?.name || `#${moduleId}`;

  const columns = [
    {
      key: 'module',
      header: t('topic'),
      render: (row) => (
        <Link to={`/evaluations/schedules/${row.id}/scores`} className="font-semibold text-accent-dark hover:underline">
          {moduleName(row.module_id)}
        </Link>
      )
    },
    { key: 'eval_date', header: 'Date', render: (row) => new Date(row.eval_date).toLocaleDateString() },
    { key: 'max_score', header: 'Max', render: (row) => row.max_score },
    { key: 'passing_score', header: 'Passing', render: (row) => row.passing_score }
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
            <Link to="/evaluations" className="hover:underline">Exams</Link> / {evaluation?.name || '…'}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {evaluation?.name}
          </h1>
          {evaluation && (
            <div className="mt-1 text-[13.5px] text-ink-500">{evaluation.type} · {evaluation.time_block}</div>
          )}
        </div>
        {can('evaluations.manage') && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Add Schedule
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {schedules && (
          <DataTable
            columns={columns}
            rows={schedules}
            rowKey={(row) => row.id}
            emptyMessage="No schedules yet — add one to start recording scores."
          />
        )}
      </div>

      {showForm && (
        <ScheduleFormModal
          onClose={() => setShowForm(false)}
          submitting={createSchedule.isPending}
          submitError={createSchedule.error?.message}
          onSubmit={(values) =>
            createSchedule.mutate(values, { onSuccess: () => setShowForm(false) })
          }
        />
      )}
    </div>
  );
}
