import { useState } from 'react';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useAttendance } from '../hooks/useAttendance';

const STATUS_VARIANT = { present: 'active', late: 'pending', excused: 'pending', absent: 'inactive' };
const PAGE_SIZE = 20;

// Read-only view for roles without attendance.mark (learner/guardian).
// GET /attendance is already row-scoped server-side (lib/rowScope.js) to
// the caller's own records — or their linked children's, for a guardian —
// so this just renders whatever comes back, no filtering needed here.
export function MyAttendanceView() {
  const [page, setPage] = useState(1);
  const { data: response = {}, isLoading, error } = useAttendance(page, PAGE_SIZE);

  // Handle both paginated and non-paginated responses
  const records = Array.isArray(response) ? response : (response.data || []);
  const meta = response.meta;

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  const total = meta?.total || 0;
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of records) counts[r.status] = (counts[r.status] || 0) + 1;
  const rate = total > 0 ? Math.round((counts.present / total) * 1000) / 10 : null;

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
        <StatCard label="Attendance Rate" value={rate != null ? `${rate}%` : '—'} />
        <StatCard label="Present" value={counts.present} />
        <StatCard label="Absent" value={counts.absent} />
        <StatCard label="Late / Excused" value={counts.late + counts.excused} />
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        <DataTable
          columns={columns}
          rows={records}
          rowKey={(row) => row.id}
          emptyMessage="No attendance has been recorded yet."
          serverPagination={meta ? { page, pageSize: PAGE_SIZE, total, onPageChange: setPage } : null}
        />
      </div>
    </div>
  );
}
