import { useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { ClassChannel } from './ClassChannel';
import { ClassCard } from './ClassCard';

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

  // useCohorts resolves to the cohort array itself (cohortsApi.list already
  // unwraps the API envelope's data field) — reading .data off it again
  // always produced [] and a permanent "No classes found".
  const cohorts = response || [];

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cohorts.map((c, i) => (
          <ClassCard key={c.id} cohort={c} to={`/app/class-channels/${c.id}`} index={i} />
        ))}
      </div>
    </div>
  );
}
