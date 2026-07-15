import { useAuth } from '../../../contexts/AuthContext';
import { MyScoreView } from './MyScoreView';
import { ScoreGradingRoster } from './ScoreGradingRoster';

// Dispatches to one of two very different views depending on permission,
// rather than one component that shows/hides pieces of a single UI. A
// grader needs the full "every learner, editable" roster; a learner
// without evaluations.grade should never even attempt to fetch that
// roster (they lack learners.view, so it would 403) — they just see their
// own score, which the backend already row-scopes for them.
export function ScoreEntryPage() {
  const { can } = useAuth();
  return can('evaluations.grade') ? <ScoreGradingRoster /> : <MyScoreView />;
}
