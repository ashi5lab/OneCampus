import { useState } from 'react';
import { useClassWiseReport } from '../hooks/useReports';
import { TrendLineChart } from '../../../components/charts/TrendLineChart';
import { DataTable } from '../../../components/DataTable';

function DateRangeTab() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, isLoading, error } = useClassWiseReport({ from, to });

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading date range report...</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  const classData = data?.data || [];
  
  // Aggregate stats
  const totalStudents = classData.reduce((sum, row) => sum + (row.student_count || 0), 0);
  const totalDays = classData.reduce((sum, row) => sum + (row.days_marked || 0), 0);
  const totalPossible = classData.reduce((sum, row) => sum + ((row.days_marked || 0) * (row.student_count || 0)), 0);
  const totalAbsent = classData.reduce((sum, row) => sum + (row.absent_count || 0), 0);
  const totalLate = classData.reduce((sum, row) => sum + (row.late_count || 0), 0);
  const totalDiscipline = classData.reduce((sum, row) => sum + (row.discipline_total || 0), 0);
  
  const presentCount = totalPossible - totalAbsent - totalLate;
  const avgAttendance = totalPossible > 0 ? Math.round((presentCount / totalPossible) * 1000) / 10 : 0;

  const columns = [
    { key: 'cohort_name', title: 'Class', sortable: true },
    { key: 'attendance_rate', title: 'Attendance %', sortable: true, render: (row) => row.attendance_rate !== null ? `${row.attendance_rate}%` : '—' },
    { key: 'absent_count', title: 'Absent', sortable: true },
    { key: 'late_count', title: 'Late', sortable: true },
    { key: 'discipline_total', title: 'Discipline', sortable: true }
  ];

  return (
    <div className="space-y-6">
      {/* Date Pickers */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-ink-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-ink-500"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded border border-border bg-surface p-4 text-center">
          <div className="text-2xl font-bold text-success">{avgAttendance}%</div>
          <div className="mt-1 text-xs font-medium text-ink-500">Avg Attendance</div>
        </div>
        <div className="rounded border border-border bg-surface p-4 text-center">
          <div className="text-2xl font-bold text-danger">{totalAbsent}</div>
          <div className="mt-1 text-xs font-medium text-ink-500">Total Absent</div>
        </div>
        <div className="rounded border border-border bg-surface p-4 text-center">
          <div className="text-2xl font-bold text-accent">{totalLate}</div>
          <div className="mt-1 text-xs font-medium text-ink-500">Total Late</div>
        </div>
        <div className="rounded border border-border bg-surface p-4 text-center">
          <div className="text-2xl font-bold text-warning">{totalDiscipline}</div>
          <div className="mt-1 text-xs font-medium text-ink-500">Discipline Incidents</div>
        </div>
      </div>

      {/* Class Wise Table */}
      <div className="rounded border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-bold text-ink-900">Class Wise Breakdown</h3>
        </div>
        <DataTable rows={classData} columns={columns} defaultSortKey="cohort_name" />
      </div>
    </div>
  );
}

export { DateRangeTab };
