import { useEffect, useMemo, useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useLearners } from '../../learners/hooks/useLearners';
import { useAttendanceForCohortDate, useMarkAttendance } from '../hooks/useAttendance';

const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused'];

const STATUS_COLORS = {
  present: 'text-success font-semibold',
  absent: 'text-danger font-semibold',
  late: 'text-accent font-semibold',
  excused: 'text-ink-900 font-semibold'
};

function todayIso() {
  // toISOString() converts to UTC, which is a day behind local "today" for
  // any timezone ahead of UTC — build the date string from local components.
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// Lets an instructor/admin pick a cohort + date, see that cohort's roster,
// and mark each learner's status in one batch — the mark endpoint upserts
// per-learner, so "Save All" just fires one POST per row.
export function AttendanceRoster() {
  const { t } = useConfig();
  const { can } = useAuth();
  const canMark = can('attendance.mark');
  const { data: cohorts } = useCohorts();
  const { data: allLearners } = useLearners();
  const markAttendance = useMarkAttendance();

  const [cohortId, setCohortId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [statuses, setStatuses] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  const { data: existingRecords, isLoading: loadingRoster } = useAttendanceForCohortDate(cohortId, date);

  const roster = useMemo(
    () => (allLearners || []).filter((learner) => String(learner.cohort_id) === String(cohortId)),
    [allLearners, cohortId]
  );

  // Re-derive local status selections whenever the cohort/date/roster/existing
  // records change, defaulting anyone not yet marked to "present".
  useEffect(() => {
    if (!cohortId || !date) return;
    const next = {};
    for (const learner of roster) {
      const existing = (existingRecords || []).find((r) => r.learner_id === learner.id);
      next[learner.id] = existing?.status || 'present';
    }
    setStatuses(next);
    setSavedAt(null);
  }, [cohortId, date, roster, existingRecords]);

  async function handleSaveAll() {
    setSaveError(null);
    try {
      await Promise.all(
        roster.map((learner) =>
          markAttendance.mutateAsync({
            learner_id: learner.id,
            cohort_id: Number(cohortId),
            date,
            status: statuses[learner.id] || 'present'
          })
        )
      );
      setSavedAt(new Date());
    } catch (err) {
      setSaveError(err.message || 'Failed to save attendance');
    }
  }

  return (
    <div className="mb-6 overflow-hidden rounded border border-border bg-surface">
      <div className="flex flex-wrap items-end gap-3 border-b border-surface-muted p-4">
        <label className="block">
          <div className="mb-1 text-xs font-semibold text-ink-700">{t('cohort')}</div>
          <select
            className="input"
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
          >
            <option value="">Select {t('cohort').toLowerCase()}…</option>
            {(cohorts || []).map((cohort) => (
              <option key={cohort.id} value={cohort.id}>{cohort.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Date</div>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        {canMark && (
          <button
            onClick={handleSaveAll}
            disabled={!cohortId || roster.length === 0 || markAttendance.isPending}
            className="rounded bg-accent px-4 py-2 text-[13.5px] font-semibold text-accent-ink disabled:opacity-60"
          >
            {markAttendance.isPending ? 'Saving…' : 'Save All'}
          </button>
        )}
        {savedAt && <span className="text-xs font-semibold text-success">Saved</span>}
        {saveError && <span className="text-xs font-semibold text-danger">{saveError}</span>}
      </div>

      {!cohortId && (
        <div className="p-6 text-center text-sm text-ink-500">
          Select a {t('cohort').toLowerCase()} and date to mark attendance.
        </div>
      )}
      {cohortId && loadingRoster && (
        <div className="p-6 text-center text-sm text-ink-500">Loading roster…</div>
      )}
      {cohortId && !loadingRoster && roster.length === 0 && (
        <div className="p-6 text-center text-sm text-ink-500">
          No {t('learners').toLowerCase()} assigned to this {t('cohort').toLowerCase()} yet.
        </div>
      )}
      {cohortId && !loadingRoster && roster.length > 0 && (
        <table className="w-full border-collapse">
          <tbody>
            {roster.map((learner) => (
              <tr key={learner.id}>
                <td className="border-b border-surface-muted px-5 py-2.5 text-[13.5px] last:border-b-0">
                  <div className="font-semibold text-ink-900">{learner.first_name} {learner.last_name}</div>
                  <div className="font-mono text-[11.5px] text-ink-500">{learner.registry_no}</div>
                </td>
                <td className="border-b border-surface-muted px-5 py-2.5 text-right last:border-b-0">
                  <select
                    className={`input w-auto disabled:opacity-60 ${STATUS_COLORS[statuses[learner.id] || 'present']}`}
                    value={statuses[learner.id] || 'present'}
                    disabled={!canMark}
                    onChange={(e) =>
                      setStatuses((prev) => ({ ...prev, [learner.id]: e.target.value }))
                    }
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
