import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useMyStaffAttendance } from '../hooks/useStaffAttendance';

const STATUS_VARIANT = { present: 'active', late: 'pending', excused: 'pending', absent: 'inactive' };

// Read-only view for a caller with staff_attendance.view_own but not
// staff_attendance.mark (a plain instructor) — mirrors MyAttendanceView.jsx.
export function MyStaffAttendanceView() {
  const { data: records, isLoading, error } = useMyStaffAttendance();

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  const total = records.length;
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of records) counts[r.status] = (counts[r.status] || 0) + 1;
  const rate = total > 0 ? Math.round((counts.present / total) * 1000) / 10 : null;

  const columns = [
    { key: 'date', header: 'Date', render: (row) => new Date(row.date).toLocaleDateString() },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] || 'pending'}>{row.status[0].toUpperCase() + row.status.slice(1)}</Badge>
      )
    },
    { key: 'remarks', header: 'Remarks', render: (row) => row.remarks || '—' }
  ];

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard label="Attendance Rate" value={rate != null ? `${rate}%` : '—'} />
        <StatCard label="Present" value={counts.present} />
        <StatCard label="Absent" value={counts.absent} />
        <StatCard label="Late / Excused" value={counts.late + counts.excused} />
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        <DataTable columns={columns} rows={records} rowKey={(row) => row.id} emptyMessage="No attendance has been recorded yet." />
      </div>
    </div>
  );
}
