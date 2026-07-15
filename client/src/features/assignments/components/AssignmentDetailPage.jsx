import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAssignments } from '../hooks/useAssignments';
import { SubmissionsRoster } from './SubmissionsRoster';
import { SubmissionForm } from './SubmissionForm';

// Dispatches to the grader roster or the learner's own submission form,
// same reasoning as evaluations/ScoreEntryPage — a learner shouldn't even
// attempt the "every learner" roster (they lack assignments.grade and the
// underlying data), they just work with their own submission, which the
// backend already row-scopes for them.
export function AssignmentDetailPage() {
  const { id } = useParams();
  const assignmentId = Number(id);
  const { can } = useAuth();
  const { t } = useConfig();
  const { data: assignments, isLoading, error } = useAssignments();

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  const assignment = assignments.find((a) => a.id === assignmentId);
  if (!assignment) return <div className="p-8 text-center text-sm text-ink-500">Assignment not found.</div>;

  const isGrader = can('assignments.grade');

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
          <Link to="/app/assignments" className="hover:underline">
            Assignments
          </Link>{' '}
          / {assignment.title}
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">{assignment.title}</h1>
        <div className="mt-1 text-[13px] text-ink-500">
          {t('topic')}: {assignment.module_name} &middot; {t('cohort')}: {assignment.cohort_name} &middot; Due{' '}
          {new Date(assignment.due_date).toLocaleDateString()}
        </div>
        {assignment.description && <p className="mt-2 text-[13.5px] text-ink-700">{assignment.description}</p>}
      </div>

      {isGrader ? <SubmissionsRoster assignment={assignment} /> : <SubmissionForm assignment={assignment} />}
    </div>
  );
}
