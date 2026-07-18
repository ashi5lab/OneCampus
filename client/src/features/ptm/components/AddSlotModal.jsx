import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useInstructors } from '../../instructors/hooks/useInstructors';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useCreateSlot } from '../hooks/usePtm';

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// canManageAny (ptm.manage — admin/staff) picks any instructor; otherwise
// this is an instructor opening their own availability, so the instructor
// picker is skipped entirely — there's nothing to choose.
export function AddSlotModal({ canManageAny, onClose }) {
  const { profile } = useAuth();
  const { data: instructors } = useInstructors({ enabled: canManageAny });
  const { data: cohorts } = useCohorts();
  const createSlot = useCreateSlot();

  const [instructorId, setInstructorId] = useState('');
  const [slotDate, setSlotDate] = useState(todayIso());
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('16:15');
  const [cohortId, setCohortId] = useState('');

  const effectiveInstructorId = canManageAny ? instructorId : profile?.instructorId;

  function handleSubmit(e) {
    e.preventDefault();
    createSlot.mutate(
      {
        instructor_id: Number(effectiveInstructorId),
        slot_date: slotDate,
        start_time: startTime,
        end_time: endTime,
        cohort_id: cohortId ? Number(cohortId) : null
      },
      { onSuccess: () => onClose() }
    );
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="w-full max-w-[400px] rounded border border-border bg-surface p-6 my-auto">
        <div className="mb-4 text-base font-bold text-ink-900">Open a Meeting Slot</div>

        {canManageAny && (
          <label className="mb-3 block">
            <div className="mb-1 text-xs font-semibold text-ink-700">Instructor</div>
            <select className="input w-full" required value={instructorId} onChange={(e) => setInstructorId(e.target.value)}>
              <option value="">Select…</option>
              {(instructors || []).map((i) => (
                <option key={i.id} value={i.id}>{i.first_name} {i.last_name}</option>
              ))}
            </select>
          </label>
        )}

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Date</div>
          <input type="date" className="input w-full" required value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
        </label>

        <div className="mb-3 flex gap-3">
          <label className="flex-1">
            <div className="mb-1 text-xs font-semibold text-ink-700">Start Time</div>
            <input type="time" className="input w-full" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="flex-1">
            <div className="mb-1 text-xs font-semibold text-ink-700">End Time</div>
            <input type="time" className="input w-full" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>

        <label className="mb-4 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Class (optional)</div>
          <select className="input w-full" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
            <option value="">Any</option>
            {(cohorts || []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        {createSlot.error && <div className="mb-3 text-xs font-semibold text-danger">{createSlot.error.message}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createSlot.isPending || !effectiveInstructorId}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {createSlot.isPending ? 'Saving…' : 'Open Slot'}
          </button>
        </div>
      </form>
    </div>
  );
}
