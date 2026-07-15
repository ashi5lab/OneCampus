import { useState } from 'react';
import { useLearners } from '../../learners/hooks/useLearners';
import { useGuardianLinks, useCreateGuardianLink, useRemoveGuardianLink } from '../hooks/useGuardianLinks';

export function GuardianLinksModal({ guardian, onClose }) {
  const { data: learners, isLoading: learnersLoading } = useLearners();
  const { data: links, isLoading: linksLoading } = useGuardianLinks();
  const createLink = useCreateGuardianLink();
  const removeLink = useRemoveGuardianLink();
  const [selectedLearnerId, setSelectedLearnerId] = useState('');

  const isLoading = learnersLoading || linksLoading;
  const linkedLearnerIds = (links || [])
    .filter((link) => link.guardian_id === guardian.id)
    .map((link) => link.learner_id);
  const linkedLearners = (learners || []).filter((learner) => linkedLearnerIds.includes(learner.id));
  const unlinkedLearners = (learners || []).filter((learner) => !linkedLearnerIds.includes(learner.id));

  function handleAdd() {
    if (!selectedLearnerId) return;
    createLink.mutate(
      { learner_id: Number(selectedLearnerId), guardian_id: guardian.id },
      { onSuccess: () => setSelectedLearnerId('') }
    );
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40">
      <div className="w-[440px] rounded border border-border bg-surface p-6">
        <div className="mb-1 text-base font-bold text-ink-900">
          Linked Learners — {guardian.first_name} {guardian.last_name}
        </div>
        <div className="mb-4 text-[11.5px] text-ink-500">
          Controls what this guardian can see (attendance, scores, certificates, activity logs).
        </div>

        {isLoading && <div className="py-4 text-center text-sm text-ink-500">Loading…</div>}

        {!isLoading && (
          <>
            {linkedLearners.length === 0 && (
              <div className="mb-3 rounded border border-border bg-surface-muted p-3 text-[12.5px] text-ink-500">
                No learners linked yet.
              </div>
            )}
            {linkedLearners.length > 0 && (
              <ul className="mb-3 divide-y divide-surface-muted rounded border border-border">
                {linkedLearners.map((learner) => (
                  <li key={learner.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-[13px] text-ink-900">
                      {learner.first_name} {learner.last_name}
                      <span className="ml-1.5 font-mono text-[11px] text-ink-500">{learner.registry_no}</span>
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
                value={selectedLearnerId}
                onChange={(e) => setSelectedLearnerId(e.target.value)}
              >
                <option value="">Select a learner…</option>
                {unlinkedLearners.map((learner) => (
                  <option key={learner.id} value={learner.id}>
                    {learner.first_name} {learner.last_name} ({learner.registry_no})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                disabled={!selectedLearnerId || createLink.isPending}
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
