import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useInstructors } from '../../instructors/hooks/useInstructors';
import { useSubstituteCoverage, useAssignSubstitute, useUnassignSubstitute } from '../hooks/useSubstitutes';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
function periodKey(period) {
  return `${period.allocation_id}-${period.date}`;
}

export function SubstituteCoverageModal({ leaveRequestId, onClose }) {
  useBodyScrollLock();
  const { can } = useAuth();
  const canManage = can('substitutes.manage');
  const { data: coverage, isLoading, error } = useSubstituteCoverage(leaveRequestId);
  const { data: instructors } = useInstructors({ enabled: canManage });
  const assignSubstitute = useAssignSubstitute(leaveRequestId);
  const unassignSubstitute = useUnassignSubstitute(leaveRequestId);
  const [picked, setPicked] = useState({});

  function handleAssign(period) {
    const substituteInstructorId = picked[periodKey(period)];
    if (!substituteInstructorId) return;
    assignSubstitute.mutate({
      leave_request_id: leaveRequestId,
      allocation_id: period.allocation_id,
      date: period.date,
      substitute_instructor_id: Number(substituteInstructorId)
    });
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
      <div className="my-auto w-full max-w-[640px] rounded border-2 border-accent bg-surface p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-base font-bold text-ink-900">Substitute Coverage</div>
            {coverage && (
              <div className="mt-1 text-[12.5px] text-ink-500">
                {coverage.leave.start_date} → {coverage.leave.end_date}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded border border-border px-3 py-1.5 text-xs font-semibold text-ink-700">
            Close
          </button>
        </div>

        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}

        {coverage && coverage.periods.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-500">
            No scheduled periods fall within this leave's dates — nothing needs covering.
          </div>
        )}

        {coverage && coverage.periods.length > 0 && (
          <div className="max-h-[55vh] overflow-y-auto rounded border border-border">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-surface-muted">
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-ink-500">Date</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-ink-500">Period</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-ink-500">Substitute</th>
                </tr>
              </thead>
              <tbody>
                {coverage.periods.map((period) => {
                  const key = periodKey(period);
                  return (
                    <tr key={key} className="border-t border-surface-muted">
                      <td className="px-3 py-2 text-ink-900">
                        {period.date}
                        <div className="text-[11px] text-ink-500">{period.weekday}</div>
                      </td>
                      <td className="px-3 py-2 text-ink-900">
                        {period.cohort_name} — {period.module_name}
                        <div className="text-[11px] text-ink-500">{period.hour}</div>
                      </td>
                      <td className="px-3 py-2">
                        {period.substitute ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-success">
                              {period.substitute.first_name} {period.substitute.last_name}
                            </span>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => unassignSubstitute.mutate(period.substitute.assignment_id)}
                                className="text-[11px] font-semibold text-danger hover:opacity-80"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ) : canManage ? (
                          <div className="flex items-center gap-2">
                            <select
                              className="input w-auto"
                              value={picked[key] || ''}
                              onChange={(e) => setPicked((prev) => ({ ...prev, [key]: e.target.value }))}
                            >
                              <option value="">Choose…</option>
                              {(instructors || []).map((i) => (
                                <option key={i.id} value={i.id}>{i.first_name} {i.last_name}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleAssign(period)}
                              disabled={!picked[key] || assignSubstitute.isPending}
                              className="rounded bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink disabled:opacity-60"
                            >
                              Assign
                            </button>
                          </div>
                        ) : (
                          <span className="text-danger">Needs coverage</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
