import { useState } from 'react';
import { useMyLearners, useBookSlot } from '../hooks/usePtm';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
export function BookSlotModal({ slot, onClose }) {
  useBodyScrollLock();
  const { data: learners, isLoading } = useMyLearners();
  const bookSlot = useBookSlot();
  const [learnerId, setLearnerId] = useState('');
  const [notes, setNotes] = useState('');

  // Falls back to the single linked child when there's only one — the form
  // field only appears (and is required) when a guardian has more than one,
  // so `learnerId` state stays empty in the single-child case and reading
  // it directly here would incorrectly block submission.
  const resolvedLearnerId = learnerId || (learners?.length === 1 ? learners[0].id : '');

  function handleSubmit(e) {
    e.preventDefault();
    bookSlot.mutate(
      { id: slot.id, payload: { learner_id: Number(resolvedLearnerId), notes: notes || null } },
      { onSuccess: () => onClose() }
    );
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="w-full max-w-[380px] rounded border-2 border-accent bg-surface p-6 my-auto">
        <div className="mb-1 text-base font-bold text-ink-900">Book This Slot</div>
        <div className="mb-4 text-[12.5px] text-ink-500">
          {slot.instructor_first_name} {slot.instructor_last_name} — {slot.slot_date}, {slot.start_time}–{slot.end_time}
        </div>

        {isLoading && <div className="mb-3 text-sm text-ink-500">Loading…</div>}

        {learners && learners.length > 1 && (
          <label className="mb-3 block">
            <div className="mb-1 text-xs font-semibold text-ink-700">Child</div>
            <select className="input w-full" required value={learnerId} onChange={(e) => setLearnerId(e.target.value)}>
              <option value="">Select…</option>
              {learners.map((l) => (
                <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
              ))}
            </select>
          </label>
        )}
        {learners && learners.length === 1 && (
          <div className="mb-3 text-[13px] text-ink-700">
            Booking for <span className="font-semibold">{learners[0].first_name} {learners[0].last_name}</span>
          </div>
        )}
        {learners && learners.length === 0 && (
          <div className="mb-3 text-[12.5px] font-semibold text-danger">No linked student found on your account.</div>
        )}

        <label className="mb-4 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Notes (optional)</div>
          <textarea className="input w-full" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {bookSlot.error && <div className="mb-3 text-xs font-semibold text-danger">{bookSlot.error.message}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={bookSlot.isPending || !resolvedLearnerId}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {bookSlot.isPending ? 'Booking…' : 'Book Slot'}
          </button>
        </div>
      </form>
    </div>
  );
}
