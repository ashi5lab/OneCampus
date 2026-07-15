import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useSubmissions, useGradeSubmission } from '../hooks/useAssignments';

// Grader-side view (admin/staff/instructor): every submission for this
// assignment, with an inline grade form per row.
export function SubmissionsRoster({ assignment }) {
  const { data: submissions, isLoading, error } = useSubmissions(assignment.id);
  const gradeSubmission = useGradeSubmission(assignment.id);
  const [grading, setGrading] = useState(null); // submission id currently being graded

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  const columns = [
    { key: 'learner', header: 'Learner', render: (row) => `${row.first_name} ${row.last_name}` },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (row.submitted_at ? <Badge variant="active">Submitted</Badge> : <Badge variant="inactive">Not submitted</Badge>)
    },
    { key: 'submission', header: 'Submission', render: (row) => <span className="line-clamp-2">{row.submission_text || '—'}</span> },
    {
      key: 'score',
      header: 'Score',
      render: (row) =>
        row.score_obtained != null ? (
          <span className="font-semibold">
            {row.score_obtained} / {assignment.max_score}
          </span>
        ) : (
          '—'
        )
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.submitted_at && (
          <button
            onClick={() => setGrading(grading === row.id ? null : row.id)}
            className="text-xs font-semibold text-accent-dark hover:underline"
          >
            {row.score_obtained != null ? 'Regrade' : 'Grade'}
          </button>
        )
    }
  ];

  return (
    <div>
      <div className="overflow-hidden rounded border border-border bg-surface">
        <DataTable columns={columns} rows={submissions} rowKey={(row) => row.id} emptyMessage="No learners in this cohort yet." />
      </div>

      {grading && (
        <GradeForm
          submission={submissions.find((s) => s.id === grading)}
          maxScore={assignment.max_score}
          onSubmit={(payload) =>
            gradeSubmission.mutate({ submissionId: grading, payload }, { onSuccess: () => setGrading(null) })
          }
          onCancel={() => setGrading(null)}
          submitting={gradeSubmission.isPending}
          submitError={gradeSubmission.error?.message}
        />
      )}
    </div>
  );
}

function GradeForm({ submission, maxScore, onSubmit, onCancel, submitting, submitError }) {
  const [score, setScore] = useState(submission?.score_obtained ?? '');
  const [feedback, setFeedback] = useState(submission?.feedback ?? '');

  return (
    <div className="mt-3 rounded border border-border bg-surface-muted p-4">
      <div className="mb-2 text-[13px] font-semibold text-ink-900">
        Grading {submission.first_name} {submission.last_name}
      </div>
      <label className="mb-2 block text-xs font-semibold text-ink-700">
        Score (out of {maxScore})
        <input
          type="number"
          className="input mt-1"
          value={score}
          onChange={(e) => setScore(e.target.value)}
        />
      </label>
      <label className="mb-3 block text-xs font-semibold text-ink-700">
        Feedback (optional)
        <textarea rows={3} className="input mt-1" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </label>
      {submitError && <div className="mb-2 text-xs font-semibold text-danger">{submitError}</div>}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit({ score_obtained: Number(score), feedback: feedback || undefined })}
          disabled={submitting || score === ''}
          className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save Grade'}
        </button>
      </div>
    </div>
  );
}
