import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserX, Clock, Users, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader } from '../../../components/PageHeader';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useAbsenteeReport } from '../hooks/useAttendance';

// Local (not UTC) YYYY-MM-DD, so "today" matches the marker's calendar day.
function toISODate(d) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function shiftDate(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function prettyDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function AbsenteeReportPage() {
  const { can } = useAuth();
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [selectedCohorts, setSelectedCohorts] = useState(() => new Set());

  const { data: cohorts } = useCohorts({ enabled: can('cohorts.view') });
  const cohortIds = useMemo(() => [...selectedCohorts], [selectedCohorts]);
  const { data: report, isLoading, error } = useAbsenteeReport(date, cohortIds);

  const summary = report?.summary || { absent: 0, late: 0, present: 0, excused: 0, total: 0 };
  const isToday = date === toISODate(new Date());

  function toggleCohort(id) {
    setSelectedCohorts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <PageHeader eyebrow="Attendance" title="Absentee Report" />

      {/* Date + class filters */}
      <div className="mb-6 space-y-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, -1))}
            aria-label="Previous day"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-ink-700 hover:bg-surface-muted"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <input
            type="date"
            value={date}
            max={toISODate(new Date())}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="rounded-lg border border-border-subtle bg-surface-muted px-3 py-2 text-sm text-ink-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, 1))}
            disabled={isToday}
            aria-label="Next day"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-ink-700 hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => setDate(toISODate(new Date()))}
              className="text-xs font-semibold text-accent hover:text-accent-dark"
            >
              Today
            </button>
          )}
          <span className="ml-1 text-sm text-ink-500">{prettyDate(date)}</span>
        </div>

        {cohorts && cohorts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
            <button
              type="button"
              onClick={() => setSelectedCohorts(new Set())}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedCohorts.size === 0
                  ? 'bg-accent text-accent-ink'
                  : 'bg-surface-muted text-ink-700 hover:bg-border'
              }`}
            >
              All classes
            </button>
            {cohorts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCohort(c.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedCohorts.has(c.id)
                    ? 'bg-accent text-accent-ink'
                    : 'bg-surface-muted text-ink-700 hover:bg-border'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SummaryCard icon={<UserX className="h-5 w-5 text-rose-600" />} iconBg="bg-rose-50" label="Absent" value={summary.absent} valueClass="text-rose-600" />
        <SummaryCard icon={<Clock className="h-5 w-5 text-orange-600" />} iconBg="bg-orange-50" label="Late" value={summary.late} valueClass="text-orange-600" />
        <SummaryCard icon={<CheckCircle className="h-5 w-5 text-emerald-600" />} iconBg="bg-emerald-50" label="Present" value={summary.present} valueClass="text-emerald-600" />
        <SummaryCard icon={<Users className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-50" label="Total Marked" value={summary.total} valueClass="text-ink-900" />
      </div>

      {isLoading && (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-ink-500">Loading report…</div>
      )}

      {error && (
        <div className="rounded-lg border border-danger bg-danger-light p-4 text-sm font-semibold text-danger">{error.message}</div>
      )}

      {report && !isLoading && report.cohorts.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <CheckCircle className="mx-auto mb-2 h-12 w-12 text-emerald-500" strokeWidth={1.5} />
          <div className="text-sm font-semibold text-ink-900">No absentees or late students</div>
          <div className="mt-1 text-xs text-ink-500">
            {summary.total === 0 ? 'No attendance has been marked for this day yet.' : 'Everyone marked was present on this day.'}
          </div>
        </div>
      )}

      {report && report.cohorts.length > 0 && (
        <div className="space-y-4">
          {report.cohorts.map((cohort) => (
            <CohortAbsenteeCard key={cohort.cohort_id ?? 'unassigned'} cohort={cohort} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, iconBg, label, value, valueClass }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
        <span className="text-[13px] font-semibold text-ink-700">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}

function CohortAbsenteeCard({ cohort }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          {cohort.cohort_id ? (
            <Link to={`/app/cohorts/${cohort.cohort_id}`} className="font-semibold text-ink-900 hover:text-accent hover:underline">
              {cohort.cohort_name}
            </Link>
          ) : (
            <span className="font-semibold text-ink-900">{cohort.cohort_name}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          {cohort.absent_count > 0 && (
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">{cohort.absent_count} absent</span>
          )}
          {cohort.late_count > 0 && (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">{cohort.late_count} late</span>
          )}
        </div>
      </div>

      <ul className="divide-y divide-border-subtle">
        {cohort.students.map((s) => (
          <li key={`${s.learner_id}-${s.status}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <Link to={`/app/learners/${s.learner_id}`} className="truncate text-sm font-medium text-ink-900 hover:text-accent hover:underline">
                {s.first_name} {s.last_name}
              </Link>
              {s.remarks && <span className="truncate text-xs text-ink-500">• {s.remarks}</span>}
            </div>
            <span
              className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                s.status === 'absent' ? 'bg-rose-50 text-rose-700' : 'bg-orange-50 text-orange-700'
              }`}
            >
              {s.status === 'absent' ? 'Absent' : 'Late'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
