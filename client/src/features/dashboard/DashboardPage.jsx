import { useConfig } from '../../contexts/ConfigContext';
import { StatCard } from '../../components/StatCard';
import { useLearners } from '../learners/hooks/useLearners';
import { useInstructors } from '../instructors/hooks/useInstructors';
import { useCohorts } from '../cohorts/hooks/useCohorts';

export function DashboardPage() {
  const { config, t } = useConfig();
  const { data: learners } = useLearners();
  const { data: instructors } = useInstructors();
  const { data: cohorts } = useCohorts();

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

      <div className="grid grid-cols-4 gap-3.5">
        <StatCard label={`Total ${t('learners')}`} value={learners?.length ?? '—'} />
        <StatCard label={`Total ${t('instructors')}`} value={instructors?.length ?? '—'} />
        <StatCard label={`Total ${t('cohorts')}`} value={cohorts?.length ?? '—'} />
      </div>
    </div>
  );
}
