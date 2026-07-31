import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { useClassWiseReport } from '../hooks/useReports';

// Per-cohort attendance rate over the last 30 days — previously
// AttendanceTrendsTab's "Class Wise" button rendered the exact same
// per-learner table as "Student Wise" (the tab state was never read), so
// there was no actual class-level aggregate anywhere in Attendance.
export function ClassWiseAttendanceTab() {
  const [search, setSearch] = useState('');
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  const { data, isLoading, error } = useClassWiseReport({ from, to });

  const rows = data?.data || [];
  const filtered = search ? rows.filter((row) => row.cohort_name?.toLowerCase().includes(search.toLowerCase())) : rows;

  const columns = [
    { key: 'cohort_name', header: 'Class', sortable: true, render: (row) => row.cohort_name },
    { key: 'student_count', header: 'Students', sortable: true, render: (row) => row.student_count ?? 0 },
    { key: 'days_marked', header: 'Days Marked', sortable: true, render: (row) => row.days_marked ?? 0 },
    { key: 'absent_count', header: 'Absent', sortable: true, render: (row) => row.absent_count ?? 0 },
    { key: 'late_count', header: 'Late', sortable: true, render: (row) => row.late_count ?? 0 },
    { key: 'attendance_rate', header: 'Rate', sortable: true, render: (row) => (row.attendance_rate != null ? `${row.attendance_rate}%` : '—') }
  ];

  const csvColumns = [
    { header: 'Class', value: (r) => r.cohort_name },
    { header: 'Students', value: (r) => r.student_count ?? 0 },
    { header: 'Days Marked', value: (r) => r.days_marked ?? 0 },
    { header: 'Absent', value: (r) => r.absent_count ?? 0 },
    { header: 'Late', value: (r) => r.late_count ?? 0 },
    { header: 'Rate %', value: (r) => r.attendance_rate ?? '' }
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <input
            type="search"
            placeholder="Search class…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-48"
          />
          {data && <span className="ml-3 text-[11.5px] text-ink-500">Last 30 days ({data.from} to {data.to})</span>}
        </div>
        <ExportCsvButton filename="class-wise-attendance" columns={csvColumns} rows={filtered} />
      </div>
      <div className="overflow-hidden bg-surface md:rounded border-0 md:border border-border -mx-4 md:mx-0">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {data && <DataTable columns={columns} rows={filtered} rowKey={(row) => row.cohort_id} emptyMessage="No classes found." />}
      </div>
    </div>
  );
}
