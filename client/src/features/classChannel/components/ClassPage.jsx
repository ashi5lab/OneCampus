import { useParams, Link } from 'react-router-dom';
import { ModuleBadge } from '../../../components/ModuleBadge';
import { useMyCohorts } from '../hooks/useClassChannel';
import { ClassChannel } from './ClassChannel';

// Handles both /app/class (no id) and /app/class/:cohortId. A caller with
// exactly one class skips straight to its channel; more than one shows a
// picker first (per the approved mock: "show cards for available classes,
// on selection show that class"); none shows an empty state — the shape
// staff without a class ends up in.
export function ClassPage() {
  const { cohortId: cohortIdParam } = useParams();
  const { data: cohorts, isLoading, error } = useMyCohorts();

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) {
    return (
      <div className="rounded border border-border bg-surface p-8 text-center text-sm font-semibold text-danger">
        {error.message}
      </div>
    );
  }

  const list = cohorts || [];

  if (list.length === 0) {
    return (
      <div className="rounded border border-border bg-surface p-10 text-center">
        <div className="text-[15px] font-semibold text-ink-900">No classes yet</div>
        <div className="mt-1 text-[13px] text-ink-500">You're not attached to a class yet.</div>
      </div>
    );
  }

  const cohortId = cohortIdParam ? Number(cohortIdParam) : list.length === 1 ? list[0].id : null;
  const cohort = cohortId ? list.find((c) => c.id === cohortId) : null;

  if (!cohort) return <ClassPicker cohorts={list} />;

  return <ClassChannel cohort={cohort} showBack={list.length > 1} />;
}

function ClassPicker({ cohorts }) {
  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Class</div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Your Classes</h1>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {cohorts.map((c) => (
          <Link
            key={c.id}
            to={`/app/class/${c.id}`}
            className="flex items-start gap-3 rounded border border-border bg-surface p-4 transition hover:border-accent active:scale-[0.99]"
          >
            <ModuleBadge moduleKey="cohorts" label={c.name} />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-ink-900">{c.name}</div>
              <div className="mt-0.5 text-[12.5px] text-ink-500">
                {c.learner_count} students
                {c.advisor_first_name ? ` · ${c.advisor_first_name} ${c.advisor_last_name}` : ''}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
