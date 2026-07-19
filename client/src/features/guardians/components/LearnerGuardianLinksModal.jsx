import { useState } from 'react';
import { useGuardians } from '../hooks/useGuardians';
import { useGuardianLinks, useCreateGuardianLink, useRemoveGuardianLink } from '../hooks/useGuardianLinks';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

// The learner-side counterpart of GuardianLinksModal — same link/unlink
// mechanics against the same onec_learner_guardian_map, just entered from a
// student's profile ("which guardians does this student have?") instead of
// a guardian's roster row ("which students does this guardian have?").
export function LearnerGuardianLinksModal({ learner, onClose }) {
  useBodyScrollLock();
  const { data: guardians, isLoading: guardiansLoading } = useGuardians();
  const { data: links, isLoading: linksLoading } = useGuardianLinks();
  const createLink = useCreateGuardianLink();
  const removeLink = useRemoveGuardianLink();
  const [selectedGuardianId, setSelectedGuardianId] = useState('');

  const isLoading = guardiansLoading || linksLoading;
  const linkedGuardianIds = (links || [])
    .filter((link) => link.learner_id === learner.id)
    .map((link) => link.guardian_id);
  const linkedGuardians = (guardians || []).filter((guardian) => linkedGuardianIds.includes(guardian.id));
  const unlinkedGuardians = (guardians || []).filter((guardian) => !linkedGuardianIds.includes(guardian.id));

  function handleAdd() {
    if (!selectedGuardianId) return;
    createLink.mutate(
      { learner_id: learner.id, guardian_id: Number(selectedGuardianId) },
      { onSuccess: () => setSelectedGuardianId('') }
    );
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4">
      <div className="w-full max-w-[440px] rounded border-2 border-accent bg-surface p-6">
        <div className="mb-1 text-base font-bold text-ink-900">
          Guardians — {learner.first_name} {learner.last_name}
        </div>
        <div className="mb-4 text-[11.5px] text-ink-500">
          Every student should have at least one guardian linked here — this controls who can see this student's attendance, scores, and certificates.
        </div>

        {isLoading && <div className="py-4 text-center text-sm text-ink-500">Loading…</div>}

        {!isLoading && (
          <>
            {linkedGuardians.length === 0 && (
              <div className="mb-3 rounded border border-border bg-surface-muted p-3 text-[12.5px] text-ink-500">
                No guardians linked yet.
              </div>
            )}
            {linkedGuardians.length > 0 && (
              <ul className="mb-3 divide-y divide-surface-muted rounded border border-border">
                {linkedGuardians.map((guardian) => (
                  <li key={guardian.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-[13px] text-ink-900">
                      {guardian.first_name} {guardian.last_name}
                      <span className="ml-1.5 font-mono text-[11px] text-ink-500">{guardian.phone}</span>
                    </span>
                    <button
                      onClick={() =>
                        removeLink.mutate({ learnerId: learner.id, guardianId: guardian.id })
                      }
                      disabled={removeLink.isPending}
                      className="text-[11.5px] font-semibold text-danger disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <select
                className="input flex-1"
                value={selectedGuardianId}
                onChange={(e) => setSelectedGuardianId(e.target.value)}
              >
                <option value="">Select a guardian…</option>
                {unlinkedGuardians.map((guardian) => (
                  <option key={guardian.id} value={guardian.id}>
                    {guardian.first_name} {guardian.last_name} ({guardian.phone})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                disabled={!selectedGuardianId || createLink.isPending}
                className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
              >
                Link
              </button>
            </div>
            {(createLink.error || removeLink.error) && (
              <div className="mt-2 text-[11px] font-semibold text-danger">
                {createLink.error?.message || removeLink.error?.message}
              </div>
            )}
          </>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
