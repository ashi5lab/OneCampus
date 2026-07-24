import { useEffect, useMemo, useState } from 'react';
import { Download, Save } from 'lucide-react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useLearners } from '../../learners/hooks/useLearners';
import { useAttendanceForCohortDate, useMarkAttendance } from '../hooks/useAttendance';

const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused'];

const STATUS_STYLES = {
  present: { bg: 'bg-success-light', text: 'text-success', label: 'Present' },
  absent: { bg: 'bg-danger-light', text: 'text-danger', label: 'Absent' },
  late: { bg: 'bg-accent-light', text: 'text-accent', label: 'Late' },
  excused: { bg: 'bg-ink-100', text: 'text-ink-700', label: 'Excused' }
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
  // Teachers may have 'cohorts.manage' without 'cohorts.view'; allow either.
  const canViewCohorts = can('cohorts.view') || can('cohorts.manage');
  const { data: cohorts } = useCohorts({ enabled: !lockedCohortId && canViewCohorts });
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
    <div>
      {/* Header Card */}
      <div className="mb-6 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-surface-muted px-5 py-4 sm:px-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ink-900">Mark Attendance</h3>
              <p className="mt-1 text-sm text-ink-500">Record presence, absence, late arrivals, and excused absences</p>
            </div>
            {savedAt && (
              <div className="flex items-center gap-2 rounded-lg bg-success-light px-3 py-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-xs font-semibold text-success">Saved</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {!lockedCohortId && (
              <label className="block flex-1 sm:flex-none">
                <div className="mb-2 text-xs font-semibold text-ink-700">{t('cohort')}</div>
                <select
                  className="input w-full"
                  value={cohortId}
                  onChange={(e) => setCohortId(e.target.value)}
                >
                  <option value="">Select {t('cohort').toLowerCase()}…</option>
                  {canViewCohorts ? (
                    (cohorts || []).map((cohort) => (
                      <option key={cohort.id} value={cohort.id}>{cohort.name}</option>
                    ))
                  ) : (
                    <option disabled>No accessible cohorts</option>
                  )}
                </select>
              </label>
            )}
            <label className="block flex-1 sm:flex-none">
              <div className="mb-2 text-xs font-semibold text-ink-700">Date</div>
              <input
                type="date"
                className="input w-full"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            {canMark && (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveAll}
                  disabled={!cohortId || roster.length === 0 || markAttendance.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-accent-ink transition hover:bg-accent-dark disabled:opacity-50 disabled:hover:bg-accent"
                >
                  <Save className="h-4 w-4" strokeWidth={2} />
                  {markAttendance.isPending ? 'Saving…' : 'Save All'}
                </button>
                <button
                  onClick={handleExport}
                  disabled={!cohortId || roster.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-ink-700 transition hover:bg-surface-muted disabled:opacity-50"
                  title="Export attendance report as CSV"
                >
                  <Download className="h-4 w-4" strokeWidth={2} />
                  Export
                </button>
              </div>
            )}
          </div>
        </div>

        {saveError && (
          <div className="border-t border-danger-light bg-danger-light px-5 py-3 sm:px-6">
            <p className="text-sm font-semibold text-danger">{saveError}</p>
          </div>
        )}
      </div>

      {!cohortId && (
        <div className="rounded-lg border border-border bg-surface-muted p-8 text-center">
          <div className="text-sm font-semibold text-ink-900">Ready to mark attendance?</div>
          <p className="mt-2 text-xs text-ink-500">
            Select a {t('cohort').toLowerCase()} and date above to begin.
          </p>
        </div>
      )}
      {cohortId && loadingRoster && (
        <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-12 w-full animate-pulse rounded bg-surface-muted" />
              <div className="h-12 w-24 animate-pulse rounded bg-surface-muted" />
              <div className="h-12 w-24 animate-pulse rounded bg-surface-muted" />
            </div>
          ))}
        </div>
      )}
      {cohortId && !loadingRoster && roster.length === 0 && (
        <div className="rounded-lg border border-border bg-surface-muted p-8 text-center">
          <div className="text-sm font-semibold text-ink-900">No learners yet</div>
          <p className="mt-2 text-xs text-ink-500">
            No {t('learners').toLowerCase()} assigned to this {t('cohort').toLowerCase()}.
          </p>
        </div>
      )}
      {cohortId && !loadingRoster && roster.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-muted">
                  <th className="border-b border-surface-muted px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-ink-500">Student Name</th>
                  <th className="border-b border-surface-muted px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-ink-500">Status</th>
                  <th className="border-b border-surface-muted px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-ink-500">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((learner, idx) => (
                  <tr key={learner.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary'} hover:bg-surface-muted/60`}>
                    <td className="border-b border-border px-5 py-4 text-[13.5px]">
                      <div className="font-semibold text-ink-900">{learner.first_name} {learner.last_name}</div>
                      <div className="font-mono text-[11px] text-ink-500">{learner.registry_no}</div>
                    </td>
                    <td className="border-b border-border px-5 py-4">
                      {canMark ? (
                        <select
                          className="input w-auto text-[13px] font-medium"
                          value={statuses[learner.id] || 'present'}
                          onChange={(e) =>
                            setStatuses((prev) => ({ ...prev, [learner.id]: e.target.value }))
                          }
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{STATUS_STYLES[status].label}</option>
                          ))}
                        </select>
                      ) : (
                        <div className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${STATUS_STYLES[statuses[learner.id] || 'present'].bg} ${STATUS_STYLES[statuses[learner.id] || 'present'].text}`}>
                          {STATUS_STYLES[statuses[learner.id] || 'present'].label}
                        </div>
                      )}
                    </td>
                    <td className="border-b border-border px-5 py-4">
                      {editingRemarksFor === learner.id ? (
                        <input
                          autoFocus
                          type="text"
                          className="input text-[13px]"
                          value={remarks[learner.id] || ''}
                          onChange={(e) =>
                            setRemarks((prev) => ({ ...prev, [learner.id]: e.target.value }))
                          }
                          onBlur={() => setEditingRemarksFor(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') {
                              setEditingRemarksFor(null);
                            }
                          }}
                          placeholder="Add remarks…"
                        />
                      ) : (
                        <button
                          className={`group flex items-center gap-1 text-[13px] transition ${canMark ? 'text-ink-500 hover:text-ink-900' : 'text-ink-500 cursor-not-allowed'}`}
                          onClick={() => canMark && setEditingRemarksFor(learner.id)}
                          disabled={!canMark}
                          type="button"
                        >
                          <span className="line-clamp-2">{remarks[learner.id] || '—'}</span>
                          {canMark && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
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
        </div>
      )}
    </div>
  );
}
