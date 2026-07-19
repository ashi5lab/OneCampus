import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavLinks } from '../../hooks/useNavLinks';
import { StatCard } from '../../components/StatCard';
import { ModuleBadge } from '../../components/ModuleBadge';
import { HorizontalBarChart } from '../../components/charts/HorizontalBarChart';
import { useDashboardReport } from '../reports/hooks/useReports';

const DASHBOARD_VIEW_KEY = 'onecampus.dashboardView';
const STATUS_LABEL = { present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused' };
const STATUS_COLOR = { present: 'var(--success)', absent: 'var(--danger)', late: 'var(--accent)', excused: 'var(--ink-500)' };

export function DashboardPage() {
  const { config } = useConfig();
  const { user } = useAuth();
  // Default is the "Your Modules" card grid, matching the redesign mock —
  // the detailed per-role reports view (attendance today, teacher/student
  // activity, etc.) is still fully there, just reachable via the toggle
  // rather than being the landing view.
  const [view, setView] = useState(() => localStorage.getItem(DASHBOARD_VIEW_KEY) || 'cards');

  function toggleView() {
    const next = view === 'reports' ? 'cards' : 'reports';
    setView(next);
    localStorage.setItem(DASHBOARD_VIEW_KEY, next);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[13.5px] text-ink-500">Good morning{user?.username ? `, ${user.username}` : ''}</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {config?.org_name || 'Dashboard'}
          </h1>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-ink-700">
          Reports View
          <button
            type="button"
            role="switch"
            aria-checked={view === 'reports'}
            onClick={toggleView}
            className={`relative h-5 w-9 rounded-full transition-colors ${view === 'reports' ? 'bg-accent' : 'bg-surface-muted'}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-transform ${
                view === 'reports' ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      </div>

      {view === 'cards' ? <FeatureCardsView /> : <ReportsView />}
    </div>
  );
}

function FeatureCardsView() {
  const links = useNavLinks();

  if (links.length === 0) {
    return (
      <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">
        Nothing to show yet — your role doesn't have access to any modules.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-500">Your Modules</div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex items-start gap-3 rounded border border-border bg-surface p-4 transition hover:border-accent active:scale-[0.99]"
          >
            <ModuleBadge moduleKey={link.key} label={link.label} />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-ink-900">{link.label}</div>
              <div className="mt-0.5 text-[12.5px] text-ink-500">{link.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ReportsView() {
  const { data, isLoading, error } = useDashboardReport();

  if (isLoading) return <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="rounded border border-border bg-surface p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  if (data.scope === 'all') return <AdminReportsView data={data} />;
  if (data.scope === 'instructor') return <InstructorReportsView data={data} />;
  if (data.scope === 'learner') return <LearnerReportsView data={data} />;
  if (data.scope === 'guardian') return <GuardianReportsView data={data} />;
  if (data.scope === 'staff') return <StaffReportsView data={data} />;

  return (
    <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">
      Use the sidebar to get started.
    </div>
  );
}

function AdminReportsView({ data }) {
  const { teacherActivity, studentActivity, staffActivity, attendanceToday } = data;
  const attendanceBars = ['present', 'absent', 'late', 'excused'].map((status) => ({
    label: STATUS_LABEL[status],
    value: attendanceToday.find((r) => r.status === status)?.count ?? 0,
    color: STATUS_COLOR[status]
  }));

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Teacher Activity (7 days)</div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <StatCard label="Attendance Marked" value={teacherActivity.attendance_marked} />
          <StatCard label="Scores Graded" value={teacherActivity.scores_graded} />
          <StatCard label="Assignments Graded" value={teacherActivity.assignments_graded} />
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Student Activity (7 days)</div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <StatCard label="Assignments Submitted" value={studentActivity.assignments_submitted} />
          <StatCard label="Online Exams Taken" value={studentActivity.exams_taken} />
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Staff Activity (7 days)</div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <StatCard label="Notices Posted" value={staffActivity.notices_posted} />
          <StatCard label="Broadcasts Sent" value={staffActivity.broadcasts_sent} />
        </div>
      </div>

      <div className="rounded border border-border bg-surface p-4">
        <div className="mb-3 text-[13.5px] font-bold text-ink-900">Today's Attendance</div>
        <HorizontalBarChart data={attendanceBars} valueSuffix="" emptyMessage="No attendance marked today." />
      </div>

      <Link to="/app/reports" className="inline-block text-xs font-semibold text-accent-dark hover:underline">
        View full reports & analytics &rarr;
      </Link>
    </div>
  );
}

function InstructorReportsView({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <StatCard label="Attendance Marked (7d)" value={data.stats.attendance_marked} />
        <StatCard label="Scores Graded" value={data.stats.scores_graded} />
      </div>
      <div className="rounded border border-border bg-surface p-4">
        <div className="mb-2 text-[13.5px] font-bold text-ink-900">My Classes (Class Teacher)</div>
        {data.myClasses.length === 0 ? (
          <div className="text-sm text-ink-500">You're not assigned as a class teacher for any class.</div>
        ) : (
          <ul className="space-y-1 text-sm text-ink-700">
            {data.myClasses.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LearnerReportsView({ data }) {
  if (!data.stats) return <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">No data yet.</div>;
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Attendance Rate (30d)" value={data.stats.attendanceRate30d != null ? `${data.stats.attendanceRate30d}%` : '—'} />
      <StatCard label="Open Assignments" value={data.stats.assignments_open} />
      <StatCard label="Published Exams" value={data.stats.exams_published} />
    </div>
  );
}

function GuardianReportsView({ data }) {
  if (data.children.length === 0) {
    return <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">No linked children yet.</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {data.children.map((child) => (
        <StatCard
          key={child.id}
          label={`${child.first_name} ${child.last_name} — Attendance (30d)`}
          value={child.attendanceRate30d != null ? `${child.attendanceRate30d}%` : '—'}
        />
      ))}
    </div>
  );
}

function StaffReportsView({ data }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      <StatCard label="Notices Posted (7d)" value={data.stats.notices_posted} />
      <StatCard label="Messages Sent (7d)" value={data.stats.messages_sent} />
    </div>
  );
}
