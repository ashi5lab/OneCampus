import { useConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard } from '../../components/StatCard';
import { useLearners } from '../learners/hooks/useLearners';
import { useInstructors } from '../instructors/hooks/useInstructors';
import { useCohorts } from '../cohorts/hooks/useCohorts';

export function DashboardPage() {
  const { config, t } = useConfig();
  const { can } = useAuth();

  const canSeeLearners = can('learners.view');
  const canSeeInstructors = can('instructors.view');
  const canSeeCohorts = can('cohorts.view');

  // Every authenticated user lands here regardless of role — a role
  // without learners.view/etc. must not even fire those requests (they'd
  // just 403 and leave the stat card stuck at "—" forever).
  const { data: learners } = useLearners({ enabled: canSeeLearners });
  const { data: instructors } = useInstructors({ enabled: canSeeInstructors });
  const { data: cohorts } = useCohorts({ enabled: canSeeCohorts });

  const stats = [
    canSeeLearners && { label: `Total ${t('learners')}`, value: learners?.length ?? '—' },
    canSeeInstructors && { label: `Total ${t('instructors')}`, value: instructors?.length ?? '—' },
    canSeeCohorts && { label: `Total ${t('cohorts')}`, value: cohorts?.length ?? '—' }
  ].filter(Boolean);

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
          Overview
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
          {config?.org_name || 'Dashboard'}
        </h1>
        <div className="mt-1 text-[13.5px] text-ink-500">
          {config?.org_type ? `${config.org_type[0].toUpperCase()}${config.org_type.slice(1)}` : ''}
        </div>
      </div>

      {stats.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
      ) : (
        <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">
          Use the sidebar to get started.
        </div>
      )}
    </div>
  );
}
