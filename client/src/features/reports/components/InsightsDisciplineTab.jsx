import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { Badge } from '../../../components/Badge';
import { useDisciplineRecordsPage } from '../../discipline/hooks/useDiscipline';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useAnalyticsReport } from '../hooks/useReports';
import { CircleCheck, CircleAlert, CircleX } from 'lucide-react';
import { tint } from '../lib/insightsTheme';

// Same Badge variant / row-tint convention DisciplinePage.jsx uses, reused
// here so a "major" incident reads identically whether seen from Insights
// or the Discipline module itself.
const SEVERITY_META = {
  positive: { variant: 'active', label: 'Positive', color: 'var(--success)', rowClass: 'bg-emerald-50/50' },
  minor: { variant: 'pending', label: 'Minor', color: 'var(--warning)', rowClass: 'bg-orange-50/50' },
  major: { variant: 'inactive', label: 'Major', color: 'var(--danger)', rowClass: 'bg-red-50/50' }
};

// Discipline's slice of the Insights "report center" — the 30-day severity
// snapshot from analytics() up top, and a genuinely full, filterable,
// server-paginated incident log underneath (reusing the same
// useDisciplineRecordsPage the standalone Discipline module uses) rather
// than only ever showing 30-day counts.
export function InsightsDisciplineTab() {
  const { data: analytics } = useAnalyticsReport();
  const { data: cohorts } = useCohorts();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [severity, setSeverity] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data: recordsData, isLoading, error } = useDisciplineRecordsPage({
    page,
    pageSize: 10,
    filters: { search, cohort_id: cohortId, severity, from_date: fromDate, to_date: toDate }
  });

  const rows = recordsData?.data || [];

  const columns = [
    { key: 'incident_date', header: 'Date', sortable: true, render: (row) => new Date(row.incident_date).toLocaleDateString() },
    {
      key: 'learner',
      header: 'Student',
      render: (row) => (
        <div>
          <div className="font-semibold text-ink-900">{row.learner_first_name} {row.learner_last_name}</div>
          <div className="font-mono text-[11px] text-ink-500">{row.learner_registry_no}</div>
        </div>
      )
    },
    { key: 'severity', header: 'Severity', render: (row) => <Badge variant={SEVERITY_META[row.severity]?.variant}>{SEVERITY_META[row.severity]?.label || row.severity}</Badge> },
    { key: 'description', header: 'Description', render: (row) => row.description || '—' },
    { key: 'action_taken', header: 'Action Taken', render: (row) => row.action_taken || '—' },
    { key: 'reported_by', header: 'Reported By', render: (row) => row.reported_by_username || '—' }
  ];

  const csvColumns = [
    { header: 'Date', value: (r) => r.incident_date },
    { header: 'Student', value: (r) => `${r.learner_first_name} ${r.learner_last_name}` },
    { header: 'Registry No', value: (r) => r.learner_registry_no },
    { header: 'Severity', value: (r) => r.severity },
    { header: 'Description', value: (r) => r.description || '' },
    { header: 'Action Taken', value: (r) => r.action_taken || '' },
    { header: 'Reported By', value: (r) => r.reported_by_username || '' }
  ];

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {['positive', 'minor', 'major'].map((sev) => {
          const count = analytics?.disciplineBySeverity30d.find((r) => r.severity === sev)?.count ?? 0;
          const meta = SEVERITY_META[sev];
          const Icon = sev === 'positive' ? CircleCheck : sev === 'minor' ? CircleAlert : CircleX;
          return (
            <div key={sev} className="flex items-center gap-3 rounded-xl border border-border p-4" style={{ background: tint(meta.color, 8) }}>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: tint(meta.color, 18), color: meta.color }}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-ink-900">{count}</div>
                <div className="text-[12px] font-semibold text-ink-700">{meta.label} · Last 30 days</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-1 gap-3 border-b border-border p-4 md:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            className="input text-sm w-full"
            placeholder="Search student name or registry no…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="input text-sm w-full" value={cohortId} onChange={(e) => { setCohortId(e.target.value); setPage(1); }}>
            <option value="">All Classes</option>
            {(cohorts || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input text-sm w-full" value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }}>
            <option value="">All Severities</option>
            <option value="positive">Positive</option>
            <option value="minor">Minor</option>
            <option value="major">Major</option>
          </select>
          <div className="flex items-center gap-2 lg:col-span-2">
            <input type="date" className="input text-sm w-full" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
            <span className="text-sm text-ink-500">to</span>
            <input type="date" className="input text-sm w-full" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="text-[13px] font-bold text-ink-900">Incident Log</div>
          <ExportCsvButton filename="discipline-log" columns={csvColumns} rows={rows} />
        </div>
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {!isLoading && !error && (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            emptyMessage="No discipline records found."
            rowClassName={(row) => SEVERITY_META[row.severity]?.rowClass || ''}
            serverPagination={{ page, pageSize: 10, total: recordsData?.meta?.total || 0, onPageChange: setPage }}
            pageSizeOptions={[10]}
          />
        )}
      </div>
    </div>
  );
}
