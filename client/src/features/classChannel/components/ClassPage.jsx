import { useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
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

import { TeacherHeader } from '../../../components/TeacherHeader';
import { CalendarDays } from 'lucide-react';
import { FlatList } from '../../../components/FlatList';
import { ClassListRow } from './ClassListRow';

// Never a grid — a teacher's own class list is always one column, at every
// breakpoint (unlike the admin Class Channels picker, which is a genuine
// multi-column grid on wider screens), so this is flat rows everywhere.
function ClassPicker({ cohorts }) {
  return (
    <div className="bg-bg min-h-screen pb-24 font-body">
      <TeacherHeader
        title="My Classes"
        subtitle="All classes you're teaching"
        showSearch={true}
        searchPlaceholder="Search classes..."
        actionIcon="filter"
      />

      <div className="px-4 relative z-20 space-y-4 pt-4">
        <div className="-mx-4">
          <FlatList className="bg-surface">
            {cohorts.map((c, i) => (
              <ClassListRow key={c.id} cohort={c} to={`/app/class/${c.id}`} index={i} />
            ))}
          </FlatList>
        </div>

        {/* Timetable Promo Banner */}
        <div className="mt-8 bg-accent-light border border-accent-light rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-surface rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 text-accent">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-ink-900">Need to manage timetable?</div>
            <div className="text-[11px] text-ink-700/80 mt-0.5">View or update class timetable</div>
          </div>
          <Link to="/app/timetable" className="bg-accent text-white px-4 py-2 rounded-xl text-[12px] font-bold shadow-sm whitespace-nowrap">
            Open Timetable
          </Link>
        </div>
      </div>
    </div>
  );
}
