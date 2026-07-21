import { useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/DataTable';
import { PageHeader } from '../../../components/PageHeader';
import { useLearners } from '../../learners/hooks/useLearners';
import { useKindergartenActivity, useLogActivity } from '../hooks/useKindergartenActivity';
import { ActivityLogFormModal } from './ActivityLogFormModal';

export function KindergartenActivityPage() {
  const { t } = useConfig();
  const { can, user } = useAuth();
  const { data: logs, isLoading, error } = useKindergartenActivity();
  // Skip this entirely for a role without learners.view — see
  // CertificatesPage for the same pattern and why "You" is only safe for
  // the learner role specifically.
  const canSeeLearnerNames = can('learners.view');
  const { data: learners } = useLearners({ enabled: canSeeLearnerNames });
  const logActivity = useLogActivity();
  const [showForm, setShowForm] = useState(false);

  const learnerName = (learnerId) => {
    if (!canSeeLearnerNames) return user?.role === 'learner' ? 'You' : `#${learnerId}`;
    const learner = (learners || []).find((l) => l.id === learnerId);
    return learner ? `${learner.first_name} ${learner.last_name}` : `#${learnerId}`;
  };

  const columns = [
    { key: 'date', header: 'Date', render: (row) => new Date(row.date).toLocaleDateString() },
    { key: 'learner', header: t('learner'), render: (row) => learnerName(row.learner_id) },
    { key: 'meal_intake', header: 'Meal', render: (row) => row.meal_intake || '—' },
    { key: 'sleep_duration', header: 'Sleep', render: (row) => row.sleep_duration || '—' },
    { key: 'activities', header: 'Activities', render: (row) => (row.activities || []).join(', ') || '—' }
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Management / Daily Activity"
        title="Daily Activity"
        actions={
          can('kindergarten_activity.log') && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
            >
              + Log Activity
            </button>
          )
        }
      />

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {logs && <DataTable columns={columns} rows={logs} rowKey={(row) => row.id} />}
      </div>

      {showForm && (
        <ActivityLogFormModal
          onClose={() => setShowForm(false)}
          submitting={logActivity.isPending}
          submitError={logActivity.error?.message}
          onSubmit={(values) =>
            logActivity.mutate(values, { onSuccess: () => setShowForm(false) })
          }
        />
      )}
    </div>
  );
}
