import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useExamSubmissions, useExamSubmissionDetail, useGradeExamSubmission } from '../hooks/useOnlineExams';

const STATUS_VARIANT = { in_progress: 'pending', submitted: 'pending', graded: 'active' };
const STATUS_LABEL = { in_progress: 'In progress', submitted: 'Submitted', graded: 'Graded' };

// Grader-side view (admin/staff/instructor): every learner's submission for
// this exam, with a per-question grading panel. Auto-graded exams already
// arrive here as 'graded' (see submitAnswers in controller.js) — a grader
// can still open one to review/override individual question scores.
export function ExamSubmissionsRoster({ exam }) {
  const { data: submissions, isLoading, error } = useExamSubmissions(exam.id);
  const [gradingId, setGradingId] = useState(null);

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  const columns = [
    { key: 'learner', header: 'Learner', render: (row) => `${row.first_name} ${row.last_name}` },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={STATUS_VARIANT[row.status] || 'inactive'}>{STATUS_LABEL[row.status] || row.status}</Badge>
    },
    {
      key: 'score',
      header: 'Score',
      render: (row) => (row.total_score != null ? `${row.total_score} / ${exam.max_score}` : '—')
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.status !== 'in_progress' && (
          <button onClick={() => setGradingId(gradingId === row.id ? null : row.id)} className="text-xs font-semibold text-accent-dark hover:underline">
            {gradingId === row.id ? 'Close' : 'View / Grade'}
          </button>
        )
    }
  ];

  return (
    <div>
      <div className="overflow-hidden rounded border border-border bg-surface">
        <DataTable columns={columns} rows={submissions} rowKey={(row) => row.id} emptyMessage="No submissions yet." />
      </div>

      {gradingId && <GradePanel submissionId={gradingId} exam={exam} onClose={() => setGradingId(null)} />}
    </div>
  );
}

function GradePanel({ submissionId, exam, onClose }) {
  const { data, isLoading } = useExamSubmissionDetail(submissionId);
  const gradeSubmission = useGradeExamSubmission(exam.id);
  const [scores, setScores] = useState({});

  if (isLoading || !data) return <div className="mt-3 p-4 text-sm text-ink-500">Loading…</div>;

  const { submission, answers } = data;

  function scoreFor(a) {
    return scores[a.question_id] !== undefined ? scores[a.question_id] : a.score_obtained ?? '';
  }

  function handleSave() {
    const payload = answers
      .filter((a) => scoreFor(a) !== '')
      .map((a) => ({ question_id: a.question_id, score_obtained: Number(scoreFor(a)) }));
    if (payload.length === 0) return;
    gradeSubmission.mutate({ submissionId, payload: { scores: payload } }, { onSuccess: onClose });
  }

  return (
    <div className="mt-3 rounded border border-border bg-surface-muted p-4">
      <div className="mb-3 text-[13px] font-semibold text-ink-900">
        Grading {submission.first_name} {submission.last_name}
      </div>
      <div className="space-y-3">
        {answers.map((a) => (
          <div key={a.question_id} className="rounded border border-border bg-surface p-3">
            <div className="mb-1 text-[13px] font-semibold text-ink-900">{a.question_text}</div>
            {a.question_type === 'mcq' ? (
              <div className="text-[13px] text-ink-700">
                Answered: {a.options?.[a.selected_option] ?? '—'}
                {a.correct_option != null && (
                  <span className="ml-2 text-[12px] text-ink-500">(Correct: {a.options?.[a.correct_option]})</span>
                )}
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-[13px] text-ink-700">{a.answer_text || '—'}</div>
            )}
            <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-ink-700">
              Score (out of {a.max_score})
              <input
                type="number"
                className="input w-24"
                value={scoreFor(a)}
                onChange={(e) => setScores((prev) => ({ ...prev, [a.question_id]: e.target.value }))}
              />
            </label>
          </div>
        ))}
      </div>
      {gradeSubmission.error && <div className="mt-2 text-xs font-semibold text-danger">{gradeSubmission.error.message}</div>}
      <div className="mt-3 flex gap-2">
        <button onClick={onClose} className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={gradeSubmission.isPending}
          className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
        >
          {gradeSubmission.isPending ? 'Saving…' : 'Save Grades'}
        </button>
      </div>
    </div>
  );
}
