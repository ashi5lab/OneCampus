import { useState, useEffect } from 'react';
import { useMySubmission, useStartExam, useSubmitExam } from '../hooks/useOnlineExams';

const STATUS_LABEL = { in_progress: 'In progress', submitted: 'Submitted — awaiting grading', graded: 'Graded' };

// Learner-side view of a single exam: start it, answer questions, submit,
// then see status/results (results only once the grader publishes — see
// getMySubmission in server/modules/onlineExams/controller.js, which nulls
// out score_obtained/feedback/total_score server-side until then).
export function ExamTaker({ exam }) {
  const { data, isLoading } = useMySubmission(exam.id);
  const startExam = useStartExam(exam.id);
  const submitExam = useSubmitExam(exam.id);
  const [answers, setAnswers] = useState({});

  const submission = data?.submission;

  useEffect(() => {
    if (data?.answers?.length) {
      const seeded = {};
      for (const a of data.answers) {
        seeded[a.question_id] = a.question_type === 'mcq' ? a.selected_option : a.answer_text;
      }
      setAnswers(seeded);
    }
  }, [data]);

  if (isLoading) return <div className="p-4 text-sm text-ink-500">Loading…</div>;

  if (!submission) {
    return (
      <div className="rounded border border-border bg-surface p-6 text-center">
        <div className="mb-3 text-[13.5px] text-ink-700">
          {exam.question_count ?? exam.questions?.length ?? 0} questions &middot; {exam.duration_minutes} minutes &middot;{' '}
          {exam.max_score} points total
        </div>
        <button
          onClick={() => startExam.mutate()}
          disabled={startExam.isPending}
          className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
        >
          {startExam.isPending ? 'Starting…' : 'Start Exam'}
        </button>
      </div>
    );
  }

  if (submission.status !== 'in_progress') {
    return (
      <div className="rounded border border-border bg-surface p-4">
        <div className="mb-3 text-[13px] font-semibold text-ink-900">{STATUS_LABEL[submission.status]}</div>
        {exam.published && submission.total_score != null && (
          <div className="mb-4 rounded bg-success/15 p-3 text-[13px] text-success">
            <div className="font-semibold">
              Score: {submission.total_score} / {exam.max_score}
            </div>
          </div>
        )}
        <div className="space-y-3">
          {(data.answers || []).map((a) => (
            <div key={a.question_id} className="rounded border border-border p-3">
              <div className="mb-1 text-[13px] font-semibold text-ink-900">{a.question_text}</div>
              {a.question_type === 'mcq' ? (
                <div className="text-[13px] text-ink-700">Your answer: {a.options?.[a.selected_option] ?? '—'}</div>
              ) : (
                <div className="text-[13px] text-ink-700">Your answer: {a.answer_text || '—'}</div>
              )}
              {exam.published && a.score_obtained != null && (
                <div className="mt-1 text-[12px] font-semibold text-success">
                  {a.score_obtained} / {a.max_score}
                  {a.feedback && <span className="ml-2 font-normal text-ink-700">{a.feedback}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const questions = exam.questions || [];

  function handleSubmit(e) {
    e.preventDefault();
    if (!window.confirm('Submit your answers? You cannot change them after submitting.')) return;
    submitExam.mutate({
      answers: questions.map((q) => ({
        question_id: q.id,
        answer_text: q.question_type === 'text' ? answers[q.id] ?? '' : undefined,
        selected_option: q.question_type === 'mcq' && answers[q.id] !== undefined ? Number(answers[q.id]) : undefined
      }))
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded border border-border bg-surface p-4">
      <div className="mb-4 space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded border border-border p-3">
            <div className="mb-2 text-[13.5px] font-semibold text-ink-900">
              {i + 1}. {q.question_text} <span className="font-normal text-ink-500">({q.max_score} pts)</span>
            </div>
            {q.question_type === 'mcq' ? (
              <div className="space-y-1.5">
                {(q.options || []).map((opt, oIndex) => (
                  <label key={oIndex} className="flex items-center gap-2 text-[13px] text-ink-700">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={Number(answers[q.id]) === oIndex}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: oIndex }))}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                rows={3}
                className="input"
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="Type your answer…"
              />
            )}
          </div>
        ))}
      </div>
      {submitExam.error && <div className="mb-3 text-xs font-semibold text-danger">{submitExam.error.message}</div>}
      <button
        type="submit"
        disabled={submitExam.isPending}
        className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
      >
        {submitExam.isPending ? 'Submitting…' : 'Submit Exam'}
      </button>
    </form>
  );
}
