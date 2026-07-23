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
//
// `lockedCohortId`, when passed (from the Class channel's Attendance tab),
// skips the cohort picker entirely and marks that one class — the same
// component, just without the "which class" question since the caller
// already knows.
export function AttendanceRoster({ lockedCohortId } = {}) {
  const { t } = useConfig();
  const { can } = useAuth();
  const canMark = can('attendance.mark');
  const { data: cohorts } = useCohorts({ enabled: !lockedCohortId });
  const { data: allLearners } = useLearners();
  const markAttendance = useMarkAttendance();

  const [cohortId, setCohortId] = useState(lockedCohortId || '');
  const [date, setDate] = useState(todayIso());
  const [statuses, setStatuses] = useState({});
  const [remarks, setRemarks] = useState({});
  const [editingRemarksFor, setEditingRemarksFor] = useState(null);
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
    const nextStatuses = {};
    const nextRemarks = {};
    for (const learner of roster) {
      const existing = (existingRecords || []).find((r) => r.learner_id === learner.id);
      nextStatuses[learner.id] = existing?.status || 'present';
      nextRemarks[learner.id] = existing?.remarks || '';
    }
    setStatuses(nextStatuses);
    setRemarks(nextRemarks);
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
            status: statuses[learner.id] || 'present',
            remarks: remarks[learner.id] || null
          })
        )
      );
      setSavedAt(new Date());
      setEditingRemarksFor(null);
    } catch (err) {
      setSaveError(err.message || 'Failed to save attendance');
    }
  }

  function handleExport() {
    // Create CSV data
    const headers = ['Student Name', 'Roll No.', 'Status', 'Remarks'];
    const rows = roster.map((learner) => [
      `${learner.first_name} ${learner.last_name}`,
      learner.registry_no,
      statuses[learner.id] || 'present',
      remarks[learner.id] || ''
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => `"${cell}"`) // Wrap in quotes to handle commas
          .join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="mb-6 overflow-hidden rounded border border-border bg-surface">
      <div className="flex flex-wrap items-end gap-3 border-b border-surface-muted p-4">
        {!lockedCohortId && (
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
        )}
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
          <>
            <button
              onClick={handleSaveAll}
              disabled={!cohortId || roster.length === 0 || markAttendance.isPending}
              className="rounded bg-accent px-4 py-2 text-[13.5px] font-semibold text-accent-ink disabled:opacity-60"
            >
              {markAttendance.isPending ? 'Saving…' : 'Save All'}
            </button>
            <button
              onClick={handleExport}
              disabled={!cohortId || roster.length === 0}
              className="rounded border border-border bg-surface px-4 py-2 text-[13.5px] font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-60 transition-colors"
              title="Export attendance report as CSV"
            >
              ↓ Export Report
            </button>
          </>
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="bg-surface-muted border-b border-surface-muted px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-500">Student Name</th>
                <th className="bg-surface-muted border-b border-surface-muted px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-500">Status</th>
                <th className="bg-surface-muted border-b border-surface-muted px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-500">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((learner) => (
                <tr key={learner.id} className="hover:bg-surface-muted/40 transition-colors">
                  <td className="border-b border-surface-muted px-5 py-2.5 text-[13.5px]">
                    <div className="font-semibold text-ink-900">{learner.first_name} {learner.last_name}</div>
                    <div className="font-mono text-[11.5px] text-ink-500">{learner.registry_no}</div>
                  </td>
                  <td className="border-b border-surface-muted px-5 py-2.5">
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
                  <td className="border-b border-surface-muted px-5 py-2.5">
                    {editingRemarksFor === learner.id ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          className="input text-sm flex-1"
                          value={remarks[learner.id] || ''}
                          onChange={(e) =>
                            setRemarks((prev) => ({ ...prev, [learner.id]: e.target.value }))
                          }
                          onBlur={() => setEditingRemarksFor(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingRemarksFor(null);
                            } else if (e.key === 'Escape') {
                              setEditingRemarksFor(null);
                            }
                          }}
                          placeholder="Add remarks..."
                        />
                      </div>
                    ) : (
                      <button
                        className="group flex items-center gap-1 text-[13.5px] text-ink-500 hover:text-ink-700"
                        onClick={() => canMark && setEditingRemarksFor(learner.id)}
                        disabled={!canMark}
                      >
                        <span>{remarks[learner.id] || '–'}</span>
                        {canMark && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-6-4l6-6m0 0v5m0-5h-5" />
                          </svg>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
