import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useCohorts } from '../hooks/useCohorts';
import { useUnits } from '../../units/hooks/useUnits';
import { useInstructors } from '../../instructors/hooks/useInstructors';
import {
  useInstructorCohorts,
  useCreateInstructorCohort,
  useRemoveInstructorCohort
} from '../../instructors/hooks/useInstructorCohorts';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'teachers', label: 'Teachers' }
];

// No dedicated getById/getProfile endpoint for cohorts — useCohorts()
// already fetches the full (unpaginated) list, so finding this one row
// client-side avoids adding backend surface that isn't otherwise needed.
export function CohortDetailPage() {
  const { id } = useParams();
  const cohortId = Number(id);
  const { t } = useConfig();
  const { data: cohorts, isLoading, error } = useCohorts();
  const { data: units } = useUnits();
  const [tab, setTab] = useState('overview');

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) {
    return (
      <div className="rounded border border-border bg-surface p-8 text-center text-sm font-semibold text-danger">
        {error.message}
      </div>
    );
  }

  const cohort = (cohorts || []).find((c) => c.id === cohortId);
  if (!cohort) {
    return (
      <div className="rounded border border-border bg-surface p-8 text-center text-sm font-semibold text-danger">
        {t('cohort')} not found.
      </div>
    );
  }

  const unitName = cohort.unit_id ? (units || []).find((u) => u.id === cohort.unit_id)?.name : null;

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
          Management / {t('cohorts')}
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">{cohort.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-500">
          {unitName && <span>{unitName}</span>}
          <span>{cohort.time_block}</span>
          {cohort.advisor_first_name && (
            <span>Class Teacher: {cohort.advisor_first_name} {cohort.advisor_last_name}</span>
          )}
        </div>
      </div>

      <div className="mb-5 flex gap-2">
        {TABS.map((tabOption) => (
          <button
            key={tabOption.value}
            onClick={() => setTab(tabOption.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === tabOption.value ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'
            }`}
          >
            {tabOption.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="overflow-hidden rounded border border-border bg-surface p-5 text-[13px] text-ink-700">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-ink-500">Unit</dt>
              <dd>{unitName || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-500">{t('term')}</dt>
              <dd>{cohort.time_block}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-500">Class Teacher</dt>
              <dd>{cohort.advisor_first_name ? `${cohort.advisor_first_name} ${cohort.advisor_last_name}` : '—'}</dd>
            </div>
          </dl>
        </div>
      )}

      {tab === 'teachers' && <CohortTeachersTab cohortId={cohortId} />}

      <Link to="/app/cohorts" className="mt-6 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900">
        &larr; Back to {t('cohorts')}
      </Link>
    </div>
  );
}

// Manages onec_instructor_cohorts — every teacher assigned to this class,
// independent of the Timetable module's per-period allocations (see the
// migration comment for why these are kept separate).
function CohortTeachersTab({ cohortId }) {
  const { t } = useConfig();
  const { can } = useAuth();
  const canManage = can('instructor_cohorts.manage');

  const { data: instructors, isLoading: instructorsLoading } = useInstructors();
  const { data: links, isLoading: linksLoading } = useInstructorCohorts();
  const createLink = useCreateInstructorCohort();
  const removeLink = useRemoveInstructorCohort();
  const [selectedInstructorId, setSelectedInstructorId] = useState('');

  const isLoading = instructorsLoading || linksLoading;
  const linkedInstructorIds = (links || [])
    .filter((link) => link.cohort_id === cohortId)
    .map((link) => link.instructor_id);
  const linkedInstructors = (instructors || []).filter((instructor) => linkedInstructorIds.includes(instructor.id));
  const unlinkedInstructors = (instructors || []).filter((instructor) => !linkedInstructorIds.includes(instructor.id));

  function handleAdd() {
    if (!selectedInstructorId) return;
    createLink.mutate(
      { instructor_id: Number(selectedInstructorId), cohort_id: cohortId },
      { onSuccess: () => setSelectedInstructorId('') }
    );
  }

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;

  return (
    <div className="overflow-hidden rounded border border-border bg-surface p-5">
      {linkedInstructors.length === 0 && (
        <div className="mb-3 rounded border border-border bg-surface-muted p-3 text-[12.5px] text-ink-500">
          No {t('instructors').toLowerCase()} assigned yet.
        </div>
      )}
      {linkedInstructors.length > 0 && (
        <ul className="mb-3 divide-y divide-surface-muted rounded border border-border">
          {linkedInstructors.map((instructor) => (
            <li key={instructor.id} className="flex items-center justify-between px-3 py-2">
              <span className="text-[13px] text-ink-900">
                {instructor.first_name} {instructor.last_name}
                <span className="ml-1.5 font-mono text-[11px] text-ink-500">{instructor.staff_id}</span>
              </span>
              {canManage && (
                <button
                  onClick={() => removeLink.mutate({ instructorId: instructor.id, cohortId })}
                  disabled={removeLink.isPending}
                  className="text-[11.5px] font-semibold text-danger disabled:opacity-60"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="flex gap-2">
          <select
            className="input flex-1"
            value={selectedInstructorId}
            onChange={(e) => setSelectedInstructorId(e.target.value)}
          >
            <option value="">Select a {t('instructor').toLowerCase()}…</option>
            {unlinkedInstructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.first_name} {instructor.last_name} ({instructor.staff_id})
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!selectedInstructorId || createLink.isPending}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            Add
          </button>
        </div>
      )}
      {(createLink.error || removeLink.error) && (
        <div className="mt-2 text-[11px] font-semibold text-danger">
          {createLink.error?.message || removeLink.error?.message}
        </div>
      )}
    </div>
  );
}
