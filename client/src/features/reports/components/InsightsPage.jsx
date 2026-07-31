import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { TrendLineChart } from '../../../components/charts/TrendLineChart';
import { HorizontalBarChart } from '../../../components/charts/HorizontalBarChart';
import { useOverviewReport, useAnalyticsReport, useClassWiseReport } from '../hooks/useReports';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Library,
  Award,
  Bell,
  UserCog,
  Footprints,
  Search,
  ArrowRight,
  CircleCheck,
  CircleAlert,
  CircleX
} from 'lucide-react';

// Fixed section→hue assignment (never re-cycled per render) using the
// validate_palette.js-checked categorical set added to theme.css
// (--chart-blue/orange/aqua/yellow/magenta/violet). Discipline stays on
// the real status tokens (--success/--warning/--danger) instead of a
// categorical hue since severity genuinely IS a status, not an identity.
const PILLAR = {
  attendance: 'var(--chart-blue)',
  academics: 'var(--chart-violet)',
  exams: 'var(--chart-orange)',
  library: 'var(--chart-aqua)',
  certificates: 'var(--chart-yellow)',
  community: 'var(--chart-magenta)'
};

const STATUS_COLOR = { present: 'var(--success)', absent: 'var(--danger)', late: 'var(--warning)', excused: 'var(--ink-300)' };
const STATUS_LABEL = { present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused' };
const SEVERITY_COLOR = { positive: 'var(--success)', minor: 'var(--warning)', major: 'var(--danger)' };
const SEVERITY_LABEL = { positive: 'Positive Notes', minor: 'Minor', major: 'Major' };

// Tint a hue against the current surface for a soft card/chip background —
// color-mix() keeps this reactive to the active theme (light/dark, and any
// data-theme override) without duplicating hex values in JS.
function tint(colorVar, pct) {
  return `color-mix(in srgb, ${colorVar} ${pct}%, var(--surface))`;
}

function shortDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Average of the second half of a series minus the average of the first
// half — a simple, honest way to say "trending up/down" without needing a
// true previous-period comparison the API doesn't provide. Returns null
// (renders no delta) when there isn't enough data to say anything.
function trendDelta(values) {
  const clean = values.filter((v) => v != null);
  if (clean.length < 4) return null;
  const mid = Math.floor(clean.length / 2);
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.round((avg(clean.slice(mid)) - avg(clean.slice(0, mid))) * 10) / 10;
}

function SectionHeading({ eyebrow, title, color }) {
  return (
    <div className="mb-3 mt-9 flex items-center gap-2 first:mt-0">
      {color && <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />}
      <div>
        {eyebrow && <div className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{eyebrow}</div>}
        <h2 className="text-[16px] font-bold text-ink-900">{title}</h2>
      </div>
    </div>
  );
}

// Headline KPI tile — colored icon chip + big number + optional up/down
// delta badge (delta uses status ink, never the pillar hue, since "good vs
// bad direction" is a status judgment, distinct from the pillar's identity
// color on the icon).
function HeroStat({ label, value, sub, icon: Icon, color, delta, deltaSuffix = '%', onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex flex-col rounded-2xl border border-border p-4 text-left transition-shadow ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      style={{ background: tint(color, 8) }}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: tint(color, 18), color }}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        {delta != null && delta !== 0 && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${delta > 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta)}{deltaSuffix}
          </span>
        )}
      </div>
      <div className="mt-3 text-[28px] font-bold leading-none text-ink-900">{value}</div>
      <div className="mt-1.5 text-[12.5px] font-semibold text-ink-700">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-500">{sub}</div>}
    </Wrapper>
  );
}

function ChartCard({ title, subtitle, color, children }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-2">
        {color && <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />}
        <div className="text-[13.5px] font-bold text-ink-900">{title}</div>
      </div>
      {subtitle && <div className="mb-3 pl-4 text-[11.5px] text-ink-500">{subtitle}</div>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

// Single segmented bar (not a 4-row chart) for "how did today go" at a
// glance — each status a fixed 2px-gapped segment sized by its share of
// the day, colored on the real status tokens. A legend always rides
// underneath (≥2 series), so identity never depends on the segment color
// alone, and each row's own count/percent is a direct label.
function StatusPulseBar({ counts }) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  const statuses = ['present', 'absent', 'late', 'excused'];

  if (total === 0) {
    return <div className="py-6 text-center text-sm text-ink-500">No attendance marked today.</div>;
  }

  return (
    <div>
      <div className="flex h-5 w-full gap-[2px] overflow-hidden rounded-full bg-surface-muted">
        {statuses.map((s) => {
          const pct = (counts[s] / total) * 100;
          if (pct <= 0) return null;
          return <div key={s} title={`${STATUS_LABEL[s]}: ${counts[s]}`} style={{ width: `${pct}%`, backgroundColor: STATUS_COLOR[s] }} />;
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {statuses.map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-[12px]">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLOR[s] }} />
            <span className="font-medium text-ink-700">{STATUS_LABEL[s]}</span>
            <span className="font-bold text-ink-900">{counts[s]}</span>
            <span className="text-ink-400">({Math.round((counts[s] / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Bottom/top-N classes by attendance rate — new content that wasn't
// surfaced anywhere before: turns the class-wise table into an actual
// "where should I look first" answer instead of requiring the reader to
// scan/sort a table themselves.
function ClassHighlightCard({ title, icon: Icon, tone, rows, metricLabel }) {
  const toneColor = tone === 'good' ? 'var(--success)' : 'var(--danger)';
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: tint(toneColor, 14), color: toneColor }}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-[13.5px] font-bold text-ink-900">{title}</div>
      </div>
      {rows.length === 0 ? (
        <div className="py-4 text-center text-[12.5px] text-ink-500">Not enough data yet.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.cohort_id} className="flex items-center justify-between rounded-lg px-2.5 py-2" style={{ backgroundColor: tint(toneColor, 6) }}>
              <span className="truncate text-[13px] font-semibold text-ink-900">{row.cohort_name}</span>
              <span className="flex-shrink-0 text-[13px] font-bold" style={{ color: toneColor }}>
                {row.attendance_rate}{metricLabel}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OpsChip({ icon: Icon, label, value, color, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 text-left ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: tint(color, 16), color }}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[15px] font-bold text-ink-900">{value}</div>
        <div className="truncate text-[11.5px] text-ink-500">{label}</div>
      </div>
    </Wrapper>
  );
}

function QuickLinkCard({ icon: Icon, title, description, color, to }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-shadow hover:shadow-md"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: tint(color, 16), color }}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold text-ink-900">{title}</div>
        <div className="text-[12px] text-ink-500">{description}</div>
      </div>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-ink-300" />
    </button>
  );
}

// Small inline "sparkbar" for a percentage table cell — a single-hue,
// precise magnitude encoding (not a novelty gauge), so the class table
// reads at a glance instead of as a wall of plain numbers.
function InlineBar({ value, color }) {
  if (value == null) return <span className="text-ink-400">—</span>;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 flex-shrink-0 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[12.5px] font-semibold text-ink-900">{value}%</span>
    </div>
  );
}

// Own route (/app/reports/more) — redesigned. Previously a fairly flat
// stack of stat-card grids and charts; now organized into named,
// color-coded pillars (Attendance/Academics/Exams/Library/Certificates/
// Community) so each section reads as its own "department" at a glance,
// plus new content the old page didn't surface at all: week-over-week
// trend deltas on the headline stats, a single-glance "today's pulse" bar,
// and Needs-Attention/Top-Performing class call-outs computed from the
// class-wise data instead of leaving the reader to scan a table for it.
export function InsightsPage() {
  const navigate = useNavigate();
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useOverviewReport();
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useAnalyticsReport();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  const { data: classWise } = useClassWiseReport({ from, to });
  const [classSearch, setClassSearch] = useState('');

  const isLoading = overviewLoading || analyticsLoading;
  const error = overviewError || analyticsError;

  const classRows = classWise?.data || [];
  const filteredClassRows = classSearch
    ? classRows.filter((r) => r.cohort_name?.toLowerCase().includes(classSearch.toLowerCase()))
    : classRows;

  const classColumns = [
    { key: 'cohort_name', header: 'Class', sortable: true, render: (row) => row.cohort_name },
    { key: 'student_count', header: 'Students', sortable: true, render: (row) => row.student_count ?? 0 },
    { key: 'attendance_rate', header: 'Attendance', sortable: true, sortValue: (row) => row.attendance_rate ?? -1, render: (row) => <InlineBar value={row.attendance_rate} color={PILLAR.attendance} /> },
    { key: 'avg_score', header: 'Avg Score', sortable: true, sortValue: (row) => row.avg_score ?? -1, render: (row) => <InlineBar value={row.avg_score != null ? Number(row.avg_score) : null} color={PILLAR.academics} /> },
    { key: 'discipline_total', header: 'Discipline', sortable: true, render: (row) => row.discipline_total ?? 0 }
  ];
  const classCsvColumns = [
    { header: 'Class', value: (r) => r.cohort_name },
    { header: 'Students', value: (r) => r.student_count ?? 0 },
    { header: 'Attendance %', value: (r) => r.attendance_rate ?? '' },
    { header: 'Avg Score %', value: (r) => r.avg_score ?? '' },
    { header: 'Discipline', value: (r) => r.discipline_total ?? 0 }
  ];

  // Only classes with actual marked days are ranked — an unmarked class
  // isn't "0% attendance," it's no data, and shouldn't show up as a worst
  // performer.
  const rankedClasses = classRows.filter((r) => r.days_marked > 0 && r.attendance_rate != null);
  const needsAttention = [...rankedClasses].sort((a, b) => a.attendance_rate - b.attendance_rate).slice(0, 3);
  const topPerforming = [...rankedClasses].sort((a, b) => b.attendance_rate - a.attendance_rate).slice(0, 3);

  const attendanceDelta = analytics ? trendDelta(analytics.attendanceTrend.map((r) => r.rate)) : null;
  const academicScores = analytics ? analytics.performanceByCohort.filter((r) => r.avg_percentage != null).map((r) => Number(r.avg_percentage)) : [];
  const academicAvg = academicScores.length > 0 ? Math.round((academicScores.reduce((s, v) => s + v, 0) / academicScores.length) * 10) / 10 : null;
  const disciplineTotal30d = analytics ? analytics.disciplineBySeverity30d.reduce((s, r) => s + r.count, 0) : 0;
  const disciplineMajor = analytics ? (analytics.disciplineBySeverity30d.find((r) => r.severity === 'major')?.count ?? 0) : 0;

  return (
    <div>
      <PageHeader eyebrow="Reports" title="Insights" subtitle="Organization-wide analytics, trends & class breakdowns" />

      {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading insights…</div>}
      {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}

      {!isLoading && !error && overview && analytics && (
        <>
          {/* Headline KPIs */}
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <HeroStat
              label="Attendance Rate"
              sub="Last 30 days"
              value={overview.attendanceRateLast30Days != null ? `${overview.attendanceRateLast30Days}%` : '—'}
              icon={CalendarCheck}
              color={PILLAR.attendance}
              delta={attendanceDelta}
              onClick={() => navigate('/app/reports/attendance')}
            />
            <HeroStat
              label="Academic Average"
              sub={`Across ${academicScores.length} class${academicScores.length === 1 ? '' : 'es'}`}
              value={academicAvg != null ? `${academicAvg}%` : '—'}
              icon={GraduationCap}
              color={PILLAR.academics}
              onClick={() => navigate('/app/reports/academics')}
            />
            <HeroStat
              label="Active Learners"
              sub={`${overview.totalCohorts} classes · ${overview.totalInstructors} instructors`}
              value={overview.totalLearners}
              icon={Users}
              color="var(--ink-500)"
              onClick={() => navigate('/app/learners')}
            />
            <HeroStat
              label="Discipline Incidents"
              sub="Last 30 days"
              value={disciplineTotal30d}
              icon={ShieldAlert}
              color={disciplineMajor > 0 ? 'var(--danger)' : disciplineTotal30d > 0 ? 'var(--warning)' : 'var(--success)'}
              onClick={() => navigate('/app/discipline')}
            />
          </div>

          {/* Today's pulse + class highlights */}
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Today's Attendance Pulse" subtitle="Every marked learner, by status" color={PILLAR.attendance}>
              <StatusPulseBar
                counts={{
                  present: analytics.attendanceToday.find((r) => r.status === 'present')?.count ?? 0,
                  absent: analytics.attendanceToday.find((r) => r.status === 'absent')?.count ?? 0,
                  late: analytics.attendanceToday.find((r) => r.status === 'late')?.count ?? 0,
                  excused: analytics.attendanceToday.find((r) => r.status === 'excused')?.count ?? 0
                }}
              />
            </ChartCard>
            <ClassHighlightCard title="Needs Attention" icon={CircleAlert} tone="bad" rows={needsAttention} metricLabel="%" />
            <ClassHighlightCard title="Top Performing" icon={CircleCheck} tone="good" rows={topPerforming} metricLabel="%" />
          </div>

          {/* Attendance trend */}
          <SectionHeading eyebrow="Attendance" title="Attendance Rate Trend" color={PILLAR.attendance} />
          <ChartCard title="Last 14 Days" subtitle="Tenant-wide daily attendance rate">
            <TrendLineChart data={analytics.attendanceTrend.map((r) => ({ label: shortDate(r.date), value: r.rate }))} color={PILLAR.attendance} valueSuffix="%" emptyMessage="No attendance recorded yet." />
          </ChartCard>

          {/* Academics + Exams */}
          <SectionHeading eyebrow="Academics & Exams" title="Performance" color={PILLAR.academics} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Academic Performance" subtitle="Average score by class" color={PILLAR.academics}>
              <HorizontalBarChart
                data={analytics.performanceByCohort.filter((r) => r.avg_percentage !== null).map((r) => ({ label: r.cohort_name, value: Number(r.avg_percentage) }))}
                color={PILLAR.academics}
                valueSuffix="%"
                emptyMessage="No graded evaluations yet."
              />
            </ChartCard>
            <ChartCard title="Online Exam Pass Rates" subtitle="Published exams with graded submissions" color={PILLAR.exams}>
              <HorizontalBarChart
                data={analytics.examPassRates.filter((r) => r.pass_rate !== null).map((r) => ({ label: r.title, value: Number(r.pass_rate) }))}
                color={PILLAR.exams}
                valueSuffix="%"
                emptyMessage="No graded online exams yet."
              />
            </ChartCard>
          </div>

          {/* Discipline */}
          <SectionHeading eyebrow="Discipline" title="Incidents by Severity (30 Days)" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {['positive', 'minor', 'major'].map((severity) => {
              const count = analytics.disciplineBySeverity30d.find((r) => r.severity === severity)?.count ?? 0;
              const Icon = severity === 'positive' ? CircleCheck : severity === 'minor' ? CircleAlert : CircleX;
              return (
                <div key={severity} className="flex items-center gap-3 rounded-xl border border-border p-4" style={{ background: tint(SEVERITY_COLOR[severity], 8) }}>
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: tint(SEVERITY_COLOR[severity], 18), color: SEVERITY_COLOR[severity] }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-ink-900">{count}</div>
                    <div className="text-[12px] font-semibold text-ink-700">{SEVERITY_LABEL[severity]}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Library */}
          <SectionHeading eyebrow="Library" title="Circulation" color={PILLAR.library} />
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <OpsChip icon={Library} label="Titles in Catalog" value={overview.libraryTotalTitles} color={PILLAR.library} onClick={() => navigate('/app/reports/more/library')} />
            <OpsChip icon={Footprints} label="Overdue Loans" value={overview.libraryOverdueLoans} color={PILLAR.library} onClick={() => navigate('/app/reports/more/library')} />
            <OpsChip icon={Award} label="Outstanding Fines" value={analytics.outstandingLibraryFines} color={PILLAR.library} onClick={() => navigate('/app/reports/more/library')} />
          </div>

          {/* Community & Operations */}
          <SectionHeading eyebrow="Community" title="Operations" color={PILLAR.community} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Visitor Traffic" subtitle="Last 14 days, gate check-ins" color={PILLAR.community}>
              <TrendLineChart data={analytics.visitorTrend.map((r) => ({ label: shortDate(r.date), value: r.count }))} color={PILLAR.community} valueSuffix="" emptyMessage="No visitors logged yet." />
            </ChartCard>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <OpsChip icon={UserCog} label="Staff Attendance (30d)" value={analytics.staffAttendanceRate30d != null ? `${analytics.staffAttendanceRate30d}%` : '—'} color={PILLAR.community} />
              <OpsChip
                icon={CalendarCheck}
                label="PTM Slots Booked"
                value={analytics.ptmTotalSlots > 0 ? `${analytics.ptmBookedSlots}/${analytics.ptmTotalSlots}` : '—'}
                color={PILLAR.community}
              />
              <OpsChip icon={Bell} label="Notices (30d)" value={overview.noticesLast30Days} color={PILLAR.community} onClick={() => navigate('/app/notices')} />
              <OpsChip icon={Award} label="Certificates Issued" value={overview.certificatesIssued} color={PILLAR.certificates} onClick={() => navigate('/app/reports/more/certificates')} />
            </div>
          </div>

          {/* Class breakdown table */}
          <SectionHeading eyebrow="Class Wise" title="Class Breakdown (Last 30 Days)" />
          <div className="rounded-xl border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <input
                type="search"
                placeholder="Search class…"
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                className="input w-48"
              />
              <ExportCsvButton filename="insights-class-breakdown" columns={classCsvColumns} rows={filteredClassRows} />
            </div>
            <DataTable rows={filteredClassRows} columns={classColumns} rowKey={(row) => row.cohort_id} emptyMessage="No classes found." />
          </div>

          {/* Quick links */}
          <SectionHeading eyebrow="Look Up" title="Student & Records Search" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <QuickLinkCard
              icon={Search}
              title="Search Students"
              description="Attendance, academics & discipline for any individual student"
              color={PILLAR.academics}
              to="/app/reports/academics"
            />
            <QuickLinkCard
              icon={Award}
              title="Certificates"
              description="Issued certificates by type & recent activity"
              color={PILLAR.certificates}
              to="/app/reports/more/certificates"
            />
          </div>
        </>
      )}
    </div>
  );
}
