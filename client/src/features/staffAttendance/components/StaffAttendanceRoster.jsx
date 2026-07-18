import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useInstructors } from '../../instructors/hooks/useInstructors';
import { useStaff } from '../../staff/hooks/useStaff';
import { useStaffAttendanceForDate, useMarkStaffAttendance } from '../hooks/useStaffAttendance';

const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused'];

const STATUS_COLORS = {
  present: 'text-success font-semibold',
  absent: 'text-danger font-semibold',
  late: 'text-accent font-semibold',
  excused: 'text-ink-900 font-semibold'
};

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// Roster identity is (staff_role, id) — not user_id, which is nullable
// (a bulk-uploaded instructor/staff member commonly has no login account,
// see server/modules/bulkUpload, but still needs to be markable here). Both
// onec_instructors and onec_staff number their own ids from 1, so a plain
// id would collide between the two lists — this key disambiguates them.
function rosterKey(staffRole, id) {
  return `${staffRole}-${id}`;
}

// Mirrors AttendanceRoster.jsx's pick-a-date/mark-the-roster/Save-All shape
// — the only structural difference is there's no cohort filter, since the
// instructor+staff roster isn't cohort-scoped the way learners are.
export function StaffAttendanceRoster() {
  const { can } = useAuth();
  const canMark = can('staff_attendance.mark');
  const { data: instructors } = useInstructors();
  const { data: staff } = useStaff();
  const markAttendance = useMarkStaffAttendance();

  const [date, setDate] = useState(todayIso());
  const [statuses, setStatuses] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  const { data: existingRecords, isLoading: loadingRoster } = useStaffAttendanceForDate(date);

  const roster = useMemo(() => {
    const combined = [
      ...(instructors || []).map((p) => ({ ...p, staff_role: 'instructor' })),
      ...(staff || []).map((p) => ({ ...p, staff_role: 'staff' }))
    ];
    return combined.sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
  }, [instructors, staff]);

  useEffect(() => {
    if (!date) return;
    const next = {};
    for (const person of roster) {
      const key = rosterKey(person.staff_role, person.id);
      const existing = (existingRecords || []).find((r) => r.staff_role === person.staff_role && r.roster_id === person.id);
      next[key] = existing?.status || 'present';
    }
    setStatuses(next);
    setSavedAt(null);
  }, [date, roster, existingRecords]);

  async function handleSaveAll() {
    setSaveError(null);
    try {
      await Promise.all(
        roster.map((person) =>
          markAttendance.mutateAsync({
            staff_role: person.staff_role,
            roster_id: person.id,
            date,
            status: statuses[rosterKey(person.staff_role, person.id)] || 'present'
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
          <div className="mb-1 text-xs font-semibold text-ink-700">Date</div>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {canMark && (
          <button
            onClick={handleSaveAll}
            disabled={roster.length === 0 || markAttendance.isPending}
            className="rounded bg-accent px-4 py-2 text-[13.5px] font-semibold text-accent-ink disabled:opacity-60"
          >
            {markAttendance.isPending ? 'Saving…' : 'Save All'}
          </button>
        )}
        {savedAt && <span className="text-xs font-semibold text-success">Saved</span>}
        {saveError && <span className="text-xs font-semibold text-danger">{saveError}</span>}
      </div>

      {loadingRoster && <div className="p-6 text-center text-sm text-ink-500">Loading roster…</div>}
      {!loadingRoster && roster.length === 0 && (
        <div className="p-6 text-center text-sm text-ink-500">No instructors or staff on record yet.</div>
      )}
      {!loadingRoster && roster.length > 0 && (
        <table className="w-full border-collapse">
          <tbody>
            {roster.map((person) => {
              const key = rosterKey(person.staff_role, person.id);
              return (
                <tr key={key}>
                  <td className="border-b border-surface-muted px-5 py-2.5 text-[13.5px] last:border-b-0">
                    <div className="font-semibold text-ink-900">{person.first_name} {person.last_name}</div>
                    <div className="font-mono text-[11.5px] text-ink-500">{person.staff_id}</div>
                  </td>
                  <td className="border-b border-surface-muted px-5 py-2.5 text-right last:border-b-0">
                    <select
                      className={`input w-auto disabled:opacity-60 ${STATUS_COLORS[statuses[key] || 'present']}`}
                      value={statuses[key] || 'present'}
                      disabled={!canMark}
                      onChange={(e) => setStatuses((prev) => ({ ...prev, [key]: e.target.value }))}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
