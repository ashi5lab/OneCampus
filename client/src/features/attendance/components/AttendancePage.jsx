import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useAttendance } from '../hooks/useAttendance';

const STATUS_VARIANT = { present: 'active', late: 'pending', absent: 'inactive', excused: 'pending' };

export function AttendancePage() {
  const { data: records, isLoading, error } = useAttendance();

  const columns = [
    { key: 'date', header: 'Date', render: (row) => new Date(row.date).toLocaleDateString() },
    { key: 'learner_id', header: 'Learner ID', render: (row) => row.learner_id },
    { key: 'cohort_id', header: 'Cohort ID', render: (row) => row.cohort_id },
    { key: 'status', header: 'Status', render: (row) => (
      <Badge variant={STATUS_VARIANT[row.status] || 'active'}>{row.status}</Badge>
    ) },
    { key: 'remarks', header: 'Remarks', render: (row) => row.remarks || '—' }
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
          Management / Attendance
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Attendance</h1>
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {records && <DataTable columns={columns} rows={records} rowKey={(row) => row.id} />}
      </div>
    </div>
  );
}
