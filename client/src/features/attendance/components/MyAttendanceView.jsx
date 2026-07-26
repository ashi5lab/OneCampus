import { useState } from 'react';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useAttendance } from '../hooks/useAttendance';
import { useDashboardReport } from '../../reports/hooks/useReports';

const STATUS_VARIANT = { present: 'active', late: 'pending', excused: 'pending', absent: 'inactive' };
const PAGE_SIZE = 20;

// Read-only view for roles without attendance.mark (learner/guardian).
// GET /attendance is exception-scoped (only absent/late/excused rows exist
// in onec_attendance under the exception-based model) — so the table shows
// non-present exceptions. Stats (rate, present count) come from the
// dashboard report which computes them correctly against cohort log days.
export function MyAttendanceView() {
  const [page, setPage] = useState(1);
  const { data: response = {}, isLoading, error } = useAttendance(page, PAGE_SIZE);
  const { data: report } = useDashboardReport();

  const records = Array.isArray(response) ? response : (response.data || []);
  const meta = response.meta;

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  // Use dashboard stats for accuracy (exception-model aware)
  const stats = report?.stats;
  const rate = stats?.attendanceRate30d ?? null;
  const present30d = stats?.present_30d ?? null;
  const marked30d = stats?.marked_30d ?? null;

  // Exception counts from current page (absent/late/excused only in this model)
  const counts = { absent: 0, late: 0, excused: 0 };
  for (const r of records) if (counts[r.status] !== undefined) counts[r.status] += 1;

  // A guardian with multiple linked children gets rows for all of them —
  // only then is the learner column worth showing.
  const multipleLearners = new Set(records.map((r) => r.learner_id)).size > 1;

  const columns = [
    { key: 'date', header: 'Date', render: (row) => new Date(row.date).toLocaleDateString() },
    ...(multipleLearners
      ? [{ key: 'learner', header: 'Learner', render: (row) => `#${row.learner_id}` }]
      : []),
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] || 'pending'}>
          {row.status[0].toUpperCase() + row.status.slice(1)}
        </Badge>
      )
    },
    { key: 'remarks', header: 'Remarks', render: (row) => row.remarks || '—' }
  ];

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard label="Attendance Rate (30d)" value={rate != null ? `${rate}%` : '—'} />
        <StatCard label="Present (30d)" value={present30d != null ? present30d : '—'} />
        <StatCard label="Total Days (30d)" value={marked30d != null ? marked30d : '—'} />
        <StatCard label="Exceptions" value={(meta?.total ?? records.length)} />
      </div>

      <div className="overflow-hidden bg-surface md:rounded border-0 md:border border-border -mx-4 md:mx-0">
        <DataTable
          columns={columns}
          rows={records}
          rowKey={(row) => row.id}
          emptyMessage="No absences or exceptions recorded yet."
          serverPagination={meta ? { page, pageSize: PAGE_SIZE, total: meta.total, onPageChange: setPage } : null}
        />
      </div>
    </div>
  );
}
