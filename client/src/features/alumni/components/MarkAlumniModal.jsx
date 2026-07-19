import { useState } from 'react';
import { useUpdateLearner } from '../../learners/hooks/useLearners';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
// Reuses the existing generic PUT /learners/:id — there's no dedicated
// alumni endpoint or table; "alumni" is just another value of
// onec_learners.status (already a free-text column), same as active/
// pending/inactive. graduation_year lives in meta, same place gender/dob
// already do for other optional per-learner details.
export function MarkAlumniModal({ learner, onClose }) {
  useBodyScrollLock();
  const updateLearner = useUpdateLearner();
  const [graduationYear, setGraduationYear] = useState(String(new Date().getFullYear()));

  function handleSubmit(e) {
    e.preventDefault();
    updateLearner.mutate(
      {
        id: learner.id,
        payload: {
          registry_no: learner.registry_no,
          first_name: learner.first_name,
          last_name: learner.last_name,
          cohort_id: learner.cohort_id,
          status: 'alumni',
          meta: { ...learner.meta, graduation_year: Number(graduationYear) }
        }
      },
      { onSuccess: () => onClose() }
    );
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="w-full max-w-[360px] rounded border-2 border-accent bg-surface p-6 my-auto">
        <div className="mb-1 text-base font-bold text-ink-900">Mark as Alumni</div>
        <div className="mb-4 text-[12.5px] text-ink-500">
          {learner.first_name} {learner.last_name} will move to the Alumni directory. This can be undone from there.
        </div>

        <label className="mb-4 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Graduation Year</div>
          <input
            type="number"
            className="input w-full"
            required
            value={graduationYear}
            onChange={(e) => setGraduationYear(e.target.value)}
          />
        </label>

        {updateLearner.error && <div className="mb-3 text-xs font-semibold text-danger">{updateLearner.error.message}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateLearner.isPending}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {updateLearner.isPending ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </form>
    </div>
  );
}
