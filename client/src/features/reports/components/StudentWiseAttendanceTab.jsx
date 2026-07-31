import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useAttendanceReport } from '../hooks/useReports';

// Per-learner attendance breakdown. Previously the Absent/Late/Excused
// columns always rendered blank — the /reports/attendance query only
// computed one combined "exception_count", never the per-status counts
// these columns actually read (row.absent_count etc). Fixed server-side
// (see server/modules/reports/controller.js#attendance); this component
// adds the search + export the reports module was missing everywhere.
export function StudentWiseAttendanceTab() {
  const { data: cohorts } = useCohorts();
  const [cohortId, setCohortId] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useAttendanceReport({ cohort_id: cohortId || undefined });

  const rows = data?.data || [];
  const filtered = search
    ? rows.filter((row) => `${row.first_name} ${row.last_name} ${row.registry_no || ''}`.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const columns = [
    { key: 'learner', header: 'Learner', sortable: true, sortValue: (row) => `${row.first_name} ${row.last_name}`, render: (row) => `${row.first_name} ${row.last_name}` },
    { key: 'cohort', header: 'Cohort', sortable: true, sortValue: (row) => row.cohort_name, render: (row) => row.cohort_name },
    { key: 'present', header: 'Present', sortable: true, sortValue: (row) => row.present_count, render: (row) => row.present_count },
    { key: 'absent', header: 'Absent', sortable: true, sortValue: (row) => row.absent_count, render: (row) => row.absent_count },
    { key: 'late', header: 'Late', sortable: true, sortValue: (row) => row.late_count, render: (row) => row.late_count },
    { key: 'excused', header: 'Excused', sortable: true, sortValue: (row) => row.excused_count, render: (row) => row.excused_count },
    { key: 'rate', header: 'Rate', sortable: true, sortValue: (row) => row.attendance_rate ?? -1, render: (row) => (row.attendance_rate != null ? `${row.attendance_rate}%` : '—') }
  ];

  const csvColumns = [
    { header: 'Learner', value: (r) => `${r.first_name} ${r.last_name}` },
    { header: 'Cohort', value: (r) => r.cohort_name },
    { header: 'Present', value: (r) => r.present_count },
    { header: 'Absent', value: (r) => r.absent_count },
    { header: 'Late', value: (r) => r.late_count },
    { header: 'Excused', value: (r) => r.excused_count },
    { header: 'Rate %', value: (r) => r.attendance_rate ?? '' }
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-ink-700">
            Cohort
            <select className="input ml-2" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
              <option value="">All cohorts</option>
              {(cohorts || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <input
            type="search"
            placeholder="Search learner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-48"
          />
          {data && <span className="text-[11.5px] text-ink-500">Last 30 days ({data.from} to {data.to})</span>}
        </div>
        <ExportCsvButton filename="student-wise-attendance" columns={csvColumns} rows={filtered} />
      </div>
      <div className="overflow-hidden bg-surface md:rounded border-0 md:border border-border -mx-4 md:mx-0">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {data && <DataTable columns={columns} rows={filtered} rowKey={(row) => row.learner_id} emptyMessage="No learners found." />}
      </div>
    </div>
  );
}
