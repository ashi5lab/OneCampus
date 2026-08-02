import { useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Heart,
  Boxes
} from 'lucide-react';
import { useOverviewReport, useAnalyticsReport, useClassWiseReport } from '../hooks/useReports';
import { PILLAR, STATUS_COLOR, STATUS_LABEL, tint } from '../lib/insightsTheme';

function shortDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Average of the second half of a series minus the average of the first
// half — a simple, honest way to say "trending up/down" without needing a
// true previous-period comparison the API doesn't provide.
function trendDelta(values) {
  const clean = values.filter((v) => v != null);
  if (clean.length < 4) return null;
  const mid = Math.floor(clean.length / 2);
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.round((avg(clean.slice(mid)) - avg(clean.slice(0, mid))) * 10) / 10;
}

function HeroStat({ label, value, sub, icon: Icon, color, delta, onClick }) {
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
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="mt-3 text-[28px] font-bold leading-none text-ink-900">{value}</div>
      <div className="mt-1.5 text-[12.5px] font-semibold text-ink-700">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-500">{sub}</div>}
    </Wrapper>
  );
}

function MiniStat({ label, value, icon: Icon, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl border border-border bg-surface p-3 text-left ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <Icon className="h-4 w-4 flex-shrink-0 text-ink-400" />
      <div className="min-w-0">
        <div className="truncate text-[14px] font-bold text-ink-900">{value}</div>
        <div className="truncate text-[11px] text-ink-500">{label}</div>
      </div>
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

function ClassHighlightCard({ title, icon: Icon, tone, rows }) {
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
              <span className="flex-shrink-0 text-[13px] font-bold" style={{ color: toneColor }}>{row.attendance_rate}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Overview — the "at a glance" landing tab of the Insights report center:
// headline KPIs (with a trend delta on Attendance Rate, and an Academic
// Average that previously only existed as a per-class bar chart, never
// averaged into one headline number), Today's Attendance Pulse, and
// Needs-Attention/Top-Performing class call-outs computed from the
// class-wise data instead of leaving the reader to scan a table for it.
export function InsightsOverviewTab() {
  const navigate = useNavigate();
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useOverviewReport();
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useAnalyticsReport();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  const { data: classWise } = useClassWiseReport({ from, to });

  const isLoading = overviewLoading || analyticsLoading;
  const error = overviewError || analyticsError;

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading insights…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;
  if (!overview || !analytics) return null;

  const classRows = classWise?.data || [];
  const rankedClasses = classRows.filter((r) => r.days_marked > 0 && r.attendance_rate != null);
  const needsAttention = [...rankedClasses].sort((a, b) => a.attendance_rate - b.attendance_rate).slice(0, 3);
  const topPerforming = [...rankedClasses].sort((a, b) => b.attendance_rate - a.attendance_rate).slice(0, 3);

  const attendanceDelta = trendDelta(analytics.attendanceTrend.map((r) => r.rate));
  const academicScores = analytics.performanceByCohort.filter((r) => r.avg_percentage != null).map((r) => Number(r.avg_percentage));
  const academicAvg = academicScores.length > 0 ? Math.round((academicScores.reduce((s, v) => s + v, 0) / academicScores.length) * 10) / 10 : null;
  const disciplineTotal30d = analytics.disciplineBySeverity30d.reduce((s, r) => s + r.count, 0);
  const disciplineMajor = analytics.disciplineBySeverity30d.find((r) => r.severity === 'major')?.count ?? 0;

  return (
    <div>
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

      <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Instructors" value={overview.totalInstructors} icon={UserCheck} onClick={() => navigate('/app/instructors')} />
        <MiniStat label="Guardians" value={overview.totalGuardians} icon={Heart} onClick={() => navigate('/app/guardians')} />
        <MiniStat label="Cohorts" value={overview.totalCohorts} icon={Boxes} onClick={() => navigate('/app/classes')} />
        <MiniStat label="Open Assignments" value={overview.assignmentsOpen} icon={GraduationCap} onClick={() => navigate('/app/assignments')} />
      </div>

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
        <ClassHighlightCard title="Needs Attention" icon={ShieldAlert} tone="bad" rows={needsAttention} />
        <ClassHighlightCard title="Top Performing" icon={TrendingUp} tone="good" rows={topPerforming} />
      </div>
    </div>
  );
}
