import { useState } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { DataTable } from '../../../components/DataTable';
import { useClassWiseReport } from '../hooks/useReports';

// Own route (/app/reports/date-range) instead of a nested ReportsPage tab
// — was crashing every load with "W.render is not a function" because its
// DataTable columns used `title` (not the `header` DataTable actually
// reads) and left most columns without a `render` fn, which DataTable
// calls unconditionally per cell. Also missing the required `rowKey` prop.
export function DateRangeReportPage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useClassWiseReport({ from, to });

  const classData = data?.data || [];
  const filtered = search
    ? classData.filter((row) => row.cohort_name?.toLowerCase().includes(search.toLowerCase()))
    : classData;

  const totalStudents = classData.reduce((sum, row) => sum + (row.student_count || 0), 0);
  const totalPossible = classData.reduce((sum, row) => sum + ((row.days_marked || 0) * (row.student_count || 0)), 0);
  const totalAbsent = classData.reduce((sum, row) => sum + (row.absent_count || 0), 0);
  const totalLate = classData.reduce((sum, row) => sum + (row.late_count || 0), 0);
  const totalDiscipline = classData.reduce((sum, row) => sum + (row.discipline_total || 0), 0);
  const presentCount = totalPossible - totalAbsent - totalLate;
  const avgAttendance = totalPossible > 0 ? Math.round((presentCount / totalPossible) * 1000) / 10 : 0;

  const columns = [
    { key: 'cohort_name', header: 'Class', sortable: true, render: (row) => row.cohort_name },
    { key: 'student_count', header: 'Students', sortable: true, render: (row) => row.student_count ?? 0 },
    { key: 'attendance_rate', header: 'Attendance %', sortable: true, render: (row) => (row.attendance_rate != null ? `${row.attendance_rate}%` : '—') },
    { key: 'absent_count', header: 'Absent', sortable: true, render: (row) => row.absent_count ?? 0 },
    { key: 'late_count', header: 'Late', sortable: true, render: (row) => row.late_count ?? 0 },
    { key: 'discipline_total', header: 'Discipline', sortable: true, render: (row) => row.discipline_total ?? 0 }
  ];

  const csvColumns = [
    { header: 'Class', value: (r) => r.cohort_name },
    { header: 'Students', value: (r) => r.student_count ?? 0 },
    { header: 'Attendance %', value: (r) => r.attendance_rate ?? '' },
    { header: 'Absent', value: (r) => r.absent_count ?? 0 },
    { header: 'Late', value: (r) => r.late_count ?? 0 },
    { header: 'Discipline', value: (r) => r.discipline_total ?? 0 }
  ];

  return (
    <div>
      <PageHeader eyebrow="Reports" title="Date Range Report" subtitle={`${totalStudents} students across ${classData.length} classes`} />

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
        </div>
      </div>

      {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading date range report…</div>}
      {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}

      {!isLoading && !error && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
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

          <div className="rounded border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h3 className="text-sm font-bold text-ink-900">Class Wise Breakdown</h3>
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  placeholder="Search class…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input w-48"
                />
                <ExportCsvButton filename="date-range-report" columns={csvColumns} rows={filtered} />
              </div>
            </div>
            <DataTable rows={filtered} columns={columns} rowKey={(row) => row.cohort_id} emptyMessage="No classes found for this range." />
          </div>
        </>
      )}
    </div>
  );
}
