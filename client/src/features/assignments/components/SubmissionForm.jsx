import { useState } from 'react';
import { useSubmissions, useSubmitAssignment } from '../hooks/useAssignments';

// Learner-side view of a single assignment: their own submission (if any),
// editable, plus their grade/feedback once graded.
export function SubmissionForm({ assignment }) {
  const { data: submissions, isLoading } = useSubmissions(assignment.id);
  const submit = useSubmitAssignment(assignment.id);
  const ownSubmission = submissions?.[0]; // scoped server-side to just the caller's own row
  const [text, setText] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    submit.mutate({ submission_text: text || ownSubmission?.submission_text }, { onSuccess: () => setText('') });
  }

  if (isLoading) return <div className="p-4 text-sm text-ink-500">Loading…</div>;

  return (
    <div className="rounded border border-border bg-surface p-4">
      {ownSubmission?.score_obtained != null && (
        <div className="mb-4 rounded bg-success/15 p-3 text-[13px] text-success">
          <div className="font-semibold">
            Graded: {ownSubmission.score_obtained} / {assignment.max_score}
          </div>
          {ownSubmission.feedback && <div className="mt-1 text-ink-700">{ownSubmission.feedback}</div>}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label className="mb-1 block text-xs font-semibold text-ink-700">
          {ownSubmission ? 'Your Submission (edit to resubmit)' : 'Your Submission'}
        </label>
        <textarea
          rows={6}
          className="input mb-3"
          defaultValue={ownSubmission?.submission_text || ''}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your answer here…"
        />
        {submit.error && <div className="mb-3 text-xs font-semibold text-danger">{submit.error.message}</div>}
        <button
          type="submit"
          disabled={submit.isPending}
          className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
        >
          {submit.isPending ? 'Submitting…' : ownSubmission ? 'Resubmit' : 'Submit'}
        </button>
        {ownSubmission?.submitted_at && (
          <span className="ml-3 text-[11px] text-ink-500">
            Last submitted {new Date(ownSubmission.submitted_at).toLocaleString()}
          </span>
        )}
      </form>
    </div>
  );
}
