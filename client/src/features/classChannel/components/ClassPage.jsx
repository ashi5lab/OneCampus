import { useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { useMyCohorts } from '../hooks/useClassChannel';
import { ClassChannel } from './ClassChannel';
import { ClassCard } from './ClassCard';

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
      <PageHeader eyebrow="Class" title="Your Classes" subtitle={`${cohorts.length} classes`} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cohorts.map((c, i) => (
          <ClassCard key={c.id} cohort={c} to={`/app/class/${c.id}`} index={i} />
        ))}
      </div>
    </div>
  );
}
