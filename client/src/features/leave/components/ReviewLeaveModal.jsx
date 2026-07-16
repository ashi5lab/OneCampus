import { useState } from 'react';
import { useReviewLeave } from '../hooks/useLeave';
import { LEAVE_TYPE_LABEL } from '../types';

export function ReviewLeaveModal({ leave, onClose }) {
  const reviewLeave = useReviewLeave();
  const [note, setNote] = useState('');

  function submit(status) {
    reviewLeave.mutate({ id: leave.id, payload: { status, review_note: note || undefined } }, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <div className="my-auto w-full max-w-[440px] rounded border border-border bg-surface p-6">
        <div className="mb-1 text-base font-bold text-ink-900">
          {leave.applicant_first_name} {leave.applicant_last_name}
        </div>
        <div className="mb-4 text-xs text-ink-500 capitalize">{leave.applicant_role}{leave.applicant_cohort_name ? ` · ${leave.applicant_cohort_name}` : ''}</div>

        <div className="mb-4 rounded border border-border bg-surface-muted p-3 text-[13px] text-ink-700">
          <div className="mb-1 font-semibold text-ink-900">{LEAVE_TYPE_LABEL[leave.leave_type]}</div>
          <div>{leave.start_date} → {leave.end_date} ({leave.num_days} day{Number(leave.num_days) === 1 ? '' : 's'}{leave.is_half_day ? `, ${leave.half_day_period === 'first_half' ? 'first half' : 'second half'}` : ''})</div>
          {leave.reason && <div className="mt-1.5 text-ink-500">{leave.reason}</div>}
        </div>

        <label className="mb-4 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Note (optional)</div>
          <textarea className="input w-full" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible to the applicant" />
        </label>

        {reviewLeave.error && <div className="mb-3 text-xs font-semibold text-danger">{reviewLeave.error.message}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700">
            Close
          </button>
          <button
            type="button"
            disabled={reviewLeave.isPending}
            onClick={() => submit('rejected')}
            className="rounded border border-danger px-3.5 py-2 text-xs font-semibold text-danger disabled:opacity-60"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={reviewLeave.isPending}
            onClick={() => submit('approved')}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
