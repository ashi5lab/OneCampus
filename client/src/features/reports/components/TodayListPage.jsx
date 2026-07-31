import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { Badge } from '../../../components/Badge';
import { useTodayReport } from '../hooks/useReports';

function fmt(time) {
  if (!time) return '—';
  return String(time).slice(0, 5);
}

const TYPES = {
  absent: {
    title: 'Absent Today',
    emptyMessage: 'No absences recorded today',
    columns: [
      { key: 'student_name', header: 'Student', sortable: true, render: (row) => row.student_name },
      { key: 'cohort_name', header: 'Class', sortable: true, render: (row) => row.cohort_name },
      { key: 'marked_by', header: 'Marked By', sortable: true, render: (row) => row.marked_by },
      { key: 'time', header: 'Time', sortable: true, render: (row) => fmt(row.time) }
    ],
    csvColumns: [
      { header: 'Student', value: (r) => r.student_name },
      { header: 'Class', value: (r) => r.cohort_name },
      { header: 'Marked By', value: (r) => r.marked_by },
      { header: 'Time', value: (r) => fmt(r.time) }
    ]
  },
  late: {
    title: 'Late Today',
    emptyMessage: 'No late arrivals today',
    columns: [
      { key: 'student_name', header: 'Student', sortable: true, render: (row) => row.student_name },
      { key: 'cohort_name', header: 'Class', sortable: true, render: (row) => row.cohort_name },
      { key: 'late_minutes', header: 'Late By', sortable: true, sortValue: (row) => row.late_minutes ?? 0, render: (row) => (row.late_minutes > 0 ? `${Math.round(row.late_minutes)} min` : '—') },
      { key: 'marked_by', header: 'Marked By', sortable: true, render: (row) => row.marked_by },
      { key: 'time', header: 'Time', sortable: true, render: (row) => fmt(row.time) }
    ],
    csvColumns: [
      { header: 'Student', value: (r) => r.student_name },
      { header: 'Class', value: (r) => r.cohort_name },
      { header: 'Late By (min)', value: (r) => (r.late_minutes > 0 ? Math.round(r.late_minutes) : '') },
      { header: 'Marked By', value: (r) => r.marked_by },
      { header: 'Time', value: (r) => fmt(r.time) }
    ]
  },
  discipline: {
    title: 'Discipline Today',
    emptyMessage: 'No discipline incidents today',
    columns: [
      { key: 'student_name', header: 'Student', sortable: true, render: (row) => row.student_name },
      { key: 'cohort_name', header: 'Class', sortable: true, render: (row) => row.cohort_name },
      { key: 'severity', header: 'Severity', sortable: true, render: (row) => <Badge variant={row.severity === 'major' ? 'danger' : row.severity === 'minor' ? 'warning' : 'active'}>{row.severity}</Badge> },
      { key: 'description', header: 'Details', render: (row) => row.description || '—' },
      { key: 'marked_by', header: 'Reported By', sortable: true, render: (row) => row.marked_by },
      { key: 'time', header: 'Time', sortable: true, render: (row) => fmt(row.time) }
    ],
    csvColumns: [
      { header: 'Student', value: (r) => r.student_name },
      { header: 'Class', value: (r) => r.cohort_name },
      { header: 'Severity', value: (r) => r.severity },
      { header: 'Details', value: (r) => r.description || '' },
      { header: 'Reported By', value: (r) => r.marked_by },
      { header: 'Time', value: (r) => fmt(r.time) }
    ]
  }
};

// Full, paginated/searchable view of one of Today's summary lists — the
// tap target for "View all" on TodayTab, which itself only ever shows the
// first 10 rows inline. Reuses the same useTodayReport() fetch (a single
// day's data is already small/bounded — the report endpoint isn't
// paginated server-side, and doesn't need to be) — DataTable does the
// pagination/search/filter/export client-side.
export function TodayListPage() {
  const { type } = useParams();
  const config = TYPES[type];
  const { data, isLoading, error } = useTodayReport();
  const [search, setSearch] = useState('');

  if (!config) return <div className="p-8 text-center text-sm font-semibold text-danger">Unknown report type.</div>;

  const rows = data?.[type] || [];
  const filtered = search
    ? rows.filter((row) => `${row.student_name} ${row.cohort_name}`.toLowerCase().includes(search.toLowerCase()))
    : rows;

  return (
    <div>
      <PageHeader eyebrow="Reports · Today" title={config.title} subtitle={`${rows.length} record${rows.length === 1 ? '' : 's'}`} />

      {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
      {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}

      {!isLoading && !error && (
        <div className="rounded border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <input
              type="search"
              placeholder="Search student or class…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-56"
            />
            <ExportCsvButton filename={`today-${type}`} columns={config.csvColumns} rows={filtered} />
          </div>
          {/* learner_id alone isn't unique for discipline (a student can
              have more than one incident in a day) — index it here since
              DataTable's rowKey only receives the row, not a position. */}
          <DataTable
            rows={filtered.map((row, i) => ({ ...row, __rowKey: i }))}
            columns={config.columns}
            rowKey={(row) => row.__rowKey}
            emptyMessage={config.emptyMessage}
          />
        </div>
      )}
    </div>
  );
}
