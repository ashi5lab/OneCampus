import { useParams, Link } from 'react-router-dom';
import { ModuleBadge } from '../../../components/ModuleBadge';
import { PageHeader } from '../../../components/PageHeader';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { ClassChannel } from './ClassChannel';

export function AdminClassChannelsPage() {
  const { cohortId: cohortIdParam } = useParams();
  const { data: response, isLoading, error } = useCohorts();

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) {
    return (
      <div className="rounded border border-border bg-surface p-8 text-center text-sm font-semibold text-danger">
        {error.message}
      </div>
    );
  }

  const cohorts = response?.data || [];

  if (cohorts.length === 0) {
    return (
      <div className="rounded border border-border bg-surface p-10 text-center">
        <div className="text-[15px] font-semibold text-ink-900">No classes found</div>
        <div className="mt-1 text-[13px] text-ink-500">There are no classes in the system yet.</div>
      </div>
    );
  }

  const cohortId = cohortIdParam ? Number(cohortIdParam) : null;
  const cohort = cohortId ? cohorts.find((c) => c.id === cohortId) : null;

  if (!cohort) return <AdminClassPicker cohorts={cohorts} />;

  return <ClassChannel cohort={cohort} showBack={true} />;
}

function AdminClassPicker({ cohorts }) {
  return (
    <div>
      <PageHeader title="Class Channels" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {cohorts.map((c) => (
          <Link
            key={c.id}
            to={`/app/class-channels/${c.id}`}
            className="flex flex-col items-start gap-2 rounded border border-border bg-surface p-3 transition hover:border-accent active:scale-[0.99]"
          >
            <ModuleBadge moduleKey="cohorts" label={c.name} />
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-ink-900 leading-tight">{c.name}</div>
              <div className="mt-1 text-[11.5px] text-ink-500 leading-tight">
                {c.learner_count} students
                {c.advisor_first_name ? <><br/>{c.advisor_first_name} {c.advisor_last_name}</> : ''}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
