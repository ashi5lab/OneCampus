import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useAttendanceReport } from '../hooks/useReports';

// Attendance's own date-range view — previously this button existed but
// rendered the same fixed "last 30 days" table as the other two tabs, with
// no date picker anywhere. The server endpoint (/reports/attendance) has
// always accepted from/to query params; the UI just never exposed them.
export function AttendanceDateRangeTab() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const { data: cohorts } = useCohorts();
  const [cohortId, setCohortId] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useAttendanceReport({ cohort_id: cohortId || undefined, from, to });

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
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
        </div>
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
        <ExportCsvButton filename="attendance-date-range" columns={csvColumns} rows={filtered} />
      </div>
      <div className="overflow-hidden bg-surface md:rounded border-0 md:border border-border -mx-4 md:mx-0">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {data && <DataTable columns={columns} rows={filtered} rowKey={(row) => row.learner_id} emptyMessage="No learners found for this range." />}
      </div>
    </div>
  );
}
