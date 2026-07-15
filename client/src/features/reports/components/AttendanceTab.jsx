import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useAttendanceReport } from '../hooks/useReports';

export function AttendanceTab() {
  const { data: cohorts } = useCohorts();
  const [cohortId, setCohortId] = useState('');
  const { data, isLoading, error } = useAttendanceReport({ cohort_id: cohortId || undefined });

  const columns = [
    { key: 'learner', header: 'Learner', render: (row) => `${row.first_name} ${row.last_name}` },
    { key: 'cohort', header: 'Cohort', render: (row) => row.cohort_name },
    { key: 'present', header: 'Present', render: (row) => row.present_count },
    { key: 'absent', header: 'Absent', render: (row) => row.absent_count },
    { key: 'late', header: 'Late', render: (row) => row.late_count },
    { key: 'excused', header: 'Excused', render: (row) => row.excused_count },
    { key: 'rate', header: 'Rate', render: (row) => (row.attendance_rate != null ? `${row.attendance_rate}%` : '—') }
  ];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <label className="text-xs font-semibold text-ink-700">
          Cohort
          <select className="input ml-2" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
            <option value="">All cohorts</option>
            {(cohorts || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {data && <span className="text-[11.5px] text-ink-500">Last 30 days ({data.from} to {data.to})</span>}
      </div>
      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {data && <DataTable columns={columns} rows={data.data} rowKey={(row) => row.learner_id} emptyMessage="No learners found." />}
      </div>
    </div>
  );
}
