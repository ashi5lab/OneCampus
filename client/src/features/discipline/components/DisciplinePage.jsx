import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useDisciplineRecords, useDeleteDisciplineRecord } from '../hooks/useDiscipline';
import { IncidentFormModal } from './IncidentFormModal';

const SEVERITY_META = {
  positive: { variant: 'active', label: 'Positive' },
  minor: { variant: 'pending', label: 'Minor' },
  major: { variant: 'inactive', label: 'Major' }
};

// discipline.view is granted to every role, row-scoped server-side (see
// server/modules/discipline/controller.js) — a learner/guardian visiting
// this page automatically sees only their own/linked children's records,
// no client-side branching needed the way AttendancePage needs one.
export function DisciplinePage() {
  const { can } = useAuth();
  const canLog = can('discipline.log');
  const [showForm, setShowForm] = useState(false);
  const { data: records, isLoading, error } = useDisciplineRecords();
  const deleteRecord = useDeleteDisciplineRecord();

  const columns = [
    { key: 'incident_date', header: 'Date', render: (row) => new Date(row.incident_date).toLocaleDateString() },
    {
      key: 'learner',
      header: 'Student',
      render: (row) => (
        <div>
          <div className="font-semibold">{row.learner_first_name} {row.learner_last_name}</div>
          <div className="font-mono text-[11px] text-ink-500">{row.learner_registry_no}</div>
        </div>
      )
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (row) => <Badge variant={SEVERITY_META[row.severity]?.variant || 'pending'}>{SEVERITY_META[row.severity]?.label || row.severity}</Badge>
    },
    { key: 'description', header: 'Description', render: (row) => row.description },
    { key: 'action_taken', header: 'Action Taken', render: (row) => row.action_taken || '—' },
    { key: 'reported_by', header: 'Reported by', render: (row) => row.reported_by_username || '—' }
  ];
  if (canLog) {
    columns.push({
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          onClick={() => {
            if (window.confirm('Delete this record?')) deleteRecord.mutate(row.id);
          }}
          className="text-xs font-semibold text-danger hover:opacity-80"
        >
          Delete
        </button>
      )
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
            {canLog ? 'Management / Discipline' : 'Discipline'}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {canLog ? 'Discipline' : 'My Behavior Record'}
          </h1>
        </div>
        {canLog && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Log Incident
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {records && <DataTable columns={columns} rows={records} rowKey={(row) => row.id} emptyMessage="No records yet." />}
      </div>

      {showForm && <IncidentFormModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
