import { useParams, Link } from 'react-router-dom';
import { useScores } from '../hooks/useEvaluations';

// Read-only view for roles with evaluations.view but not .grade (learner/
// guardian). Never fetches the learner roster — GET /schedules/:id/scores
// is already row-scoped server-side to "my own score" for a learner, so
// there's nothing else to show.
export function MyScoreView() {
  const { scheduleId } = useParams();
  const { data: scores, isLoading, error } = useScores(scheduleId);
  const myScore = scores?.[0];

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
          <Link to="/app/evaluations" className="hover:underline">Exams</Link> / Score
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Your Score</h1>
      </div>

      <div className="rounded border border-border bg-surface p-8 text-center">
        {isLoading && <div className="text-sm text-ink-500">Loading…</div>}
        {error && <div className="text-sm font-semibold text-danger">{error.message}</div>}
        {!isLoading && !error && myScore && (
          <div>
            <div className="font-display text-4xl font-bold text-ink-900">{myScore.score_obtained}</div>
            {myScore.remarks && <div className="mt-2 text-sm text-ink-500">{myScore.remarks}</div>}
          </div>
        )}
        {!isLoading && !error && !myScore && (
          <div className="text-sm text-ink-500">Not yet graded.</div>
        )}
      </div>
    </div>
  );
}
