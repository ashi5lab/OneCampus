import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { TrendLineChart } from '../../../components/charts/TrendLineChart';
import { useAnalyticsReport, useClassWiseReport } from '../hooks/useReports';
import { PILLAR } from '../lib/insightsTheme';

const ATTENDANCE = PILLAR.attendance;

function InlineBar({ value }) {
  if (value == null) return <span className="text-ink-400">—</span>;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 flex-shrink-0 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: ATTENDANCE }} />
      </div>
      <span className="text-[12.5px] font-semibold text-ink-900">{value}%</span>
    </div>
  );
}

function shortDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const PRESETS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 }
];

// Attendance's own date-range control (its own section, not a page-wide
// one) — genuinely drives the class-wise breakdown table below it, unlike
// a page-wide filter that would silently do nothing on the fixed-window
// analytics() trend chart above it.
export function InsightsAttendanceTab() {
  const { data: analytics } = useAnalyticsReport();
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const { data: classWise, isLoading } = useClassWiseReport({ from, to });

  const rows = classWise?.data || [];
  const filtered = search ? rows.filter((r) => r.cohort_name?.toLowerCase().includes(search.toLowerCase())) : rows;

  function applyPreset(days) {
    setFrom(new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setTo(new Date().toISOString().slice(0, 10));
  }

  const columns = [
    { key: 'cohort_name', header: 'Class', sortable: true, render: (row) => row.cohort_name },
    { key: 'student_count', header: 'Students', sortable: true, render: (row) => row.student_count ?? 0 },
    { key: 'days_marked', header: 'Days Marked', sortable: true, render: (row) => row.days_marked ?? 0 },
    { key: 'absent_count', header: 'Absent', sortable: true, render: (row) => row.absent_count ?? 0 },
    { key: 'late_count', header: 'Late', sortable: true, render: (row) => row.late_count ?? 0 },
    { key: 'attendance_rate', header: 'Attendance Rate', sortable: true, sortValue: (row) => row.attendance_rate ?? -1, render: (row) => <InlineBar value={row.attendance_rate} /> },
    { key: 'discipline_total', header: 'Discipline', sortable: true, render: (row) => row.discipline_total ?? 0 }
  ];
  const csvColumns = [
    { header: 'Class', value: (r) => r.cohort_name },
    { header: 'Students', value: (r) => r.student_count ?? 0 },
    { header: 'Days Marked', value: (r) => r.days_marked ?? 0 },
    { header: 'Absent', value: (r) => r.absent_count ?? 0 },
    { header: 'Late', value: (r) => r.late_count ?? 0 },
    { header: 'Attendance Rate %', value: (r) => r.attendance_rate ?? '' },
    { header: 'Discipline', value: (r) => r.discipline_total ?? 0 }
  ];

  return (
    <div>
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: ATTENDANCE }} />
          <div className="text-[13.5px] font-bold text-ink-900">Daily Attendance Rate</div>
        </div>
        <div className="mb-3 pl-4 text-[11.5px] text-ink-500">Last 14 days, tenant-wide (fixed window)</div>
        <TrendLineChart
          data={(analytics?.attendanceTrend || []).map((r) => ({ label: shortDate(r.date), value: r.rate }))}
          color={ATTENDANCE}
          valueSuffix="%"
          emptyMessage="No attendance recorded yet."
        />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <div className="text-[13.5px] font-bold text-ink-900">Class Breakdown</div>
            <div className="text-[11.5px] text-ink-500">{from} to {to}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.days)}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-[11.5px] font-semibold text-ink-700 hover:bg-surface-muted"
              >
                {p.label}
              </button>
            ))}
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
            <span className="text-xs text-ink-500">to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <input type="search" placeholder="Search class…" value={search} onChange={(e) => setSearch(e.target.value)} className="input w-48" />
          <ExportCsvButton filename="attendance-class-breakdown" columns={csvColumns} rows={filtered} />
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-ink-500">Loading…</div>
        ) : (
          <DataTable rows={filtered} columns={columns} rowKey={(row) => row.cohort_id} emptyMessage="No classes found for this range." />
        )}
      </div>
    </div>
  );
}
