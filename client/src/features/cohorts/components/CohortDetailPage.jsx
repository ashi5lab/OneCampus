import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useCohorts, useUpdateCohort, useDeleteCohort } from '../hooks/useCohorts';
import { useUnits } from '../../units/hooks/useUnits';
import { useInstructors } from '../../instructors/hooks/useInstructors';
import {
  useInstructorCohorts,
  useCreateInstructorCohort,
  useRemoveInstructorCohort
} from '../../instructors/hooks/useInstructorCohorts';
import { ModuleBadge } from '../../../components/ModuleBadge';
import { CohortFormModal } from './CohortFormModal';

const MODULE_TILES = [
  { key: 'attendance', label: 'Mark Attendance', to: () => '/app/attendance' },
  { key: 'timetable', label: 'Timetable', to: (id) => `/app/timetable?cohort=${id}` },
  { key: 'assignments', label: 'Assignments', to: () => '/app/assignments' },
  { key: 'exams', label: 'Exams', to: () => '/app/exams' },
  { key: 'reports', label: 'Reports', to: () => '/app/reports' }
];

// No dedicated getById/getProfile endpoint for cohorts — useCohorts()
// already fetches the full (unpaginated) list, so finding this one row
// client-side avoids adding backend surface that isn't otherwise needed.
export function CohortDetailPage() {
  const { id } = useParams();
  const cohortId = Number(id);
  const navigate = useNavigate();
  const { t } = useConfig();
  const { can } = useAuth();
  const { data: cohorts, isLoading, error } = useCohorts();
  const { data: units } = useUnits();
  const updateCohort = useUpdateCohort();
  const deleteCohort = useDeleteCohort();
  const [view, setView] = useState('modules');
  const [showEdit, setShowEdit] = useState(false);

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

  const tiles = [
    ...MODULE_TILES.map((m) => ({ ...m, kind: 'link', to: m.to(cohortId) })),
    { key: 'instructor_cohorts', label: 'Teachers', kind: 'view', view: 'teachers' },
    { key: 'cohorts', label: 'Settings', kind: 'action', onClick: () => setShowEdit(true) }
  ];

  return (
    <div>
      {view === 'modules' && (
        <>
          <div className="mb-6">
            <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
              Management / {t('cohorts')}
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">{cohort.name}</h1>
            <div className="mt-1 text-[13px] text-ink-500">
              {cohort.learner_count} students{cohort.advisor_first_name ? ` · ${cohort.advisor_first_name} ${cohort.advisor_last_name}` : ''}
            </div>
            {(unitName || cohort.time_block) && (
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-500">
                {unitName && <span>{unitName}</span>}
                {unitName && cohort.time_block && <span>&middot;</span>}
                {cohort.time_block && <span>{cohort.time_block}</span>}
              </div>
            )}
          </div>

          <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-500">Modules</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tiles.map((tile) =>
              tile.kind === 'link' ? (
                <Link
                  key={tile.key}
                  to={tile.to}
                  className="flex flex-col items-start gap-2.5 rounded border border-border bg-surface p-4 transition hover:border-accent"
                >
                  <ModuleBadge moduleKey={tile.key} label={tile.label} size={34} />
                  <div className="text-[13.5px] font-semibold text-ink-900">{tile.label}</div>
                </Link>
              ) : (
                <button
                  key={tile.key}
                  type="button"
                  onClick={tile.kind === 'view' ? () => setView(tile.view) : tile.onClick}
                  className="flex flex-col items-start gap-2.5 rounded border border-border bg-surface p-4 text-left transition hover:border-accent"
                >
                  <ModuleBadge moduleKey={tile.key} label={tile.label} size={34} />
                  <div className="text-[13.5px] font-semibold text-ink-900">{tile.label}</div>
                </button>
              )
            )}
          </div>

          <Link to="/app/cohorts" className="mt-6 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900">
            &larr; Back to {t('cohorts')}
          </Link>
        </>
      )}

      {view === 'teachers' && (
        <>
          <button
            type="button"
            onClick={() => setView('modules')}
            className="mb-4 flex items-center gap-1 text-[12.5px] font-semibold text-ink-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {cohort.name} / Teachers
          </button>
          <CohortTeachersTab cohortId={cohortId} />
        </>
      )}

      {showEdit && (
        <CohortFormModal
          initialData={cohort}
          onClose={() => setShowEdit(false)}
          submitting={updateCohort.isPending}
          submitError={updateCohort.error?.message}
          onSubmit={(values) =>
            updateCohort.mutate({ id: cohortId, payload: values }, { onSuccess: () => setShowEdit(false) })
          }
          onDelete={
            can('cohorts.manage')
              ? () => {
                  if (!window.confirm(`Are you sure you want to delete ${cohort.name}?`)) return;
                  deleteCohort.mutate(cohortId, { onSuccess: () => navigate('/app/cohorts') });
                }
              : null
          }
        />
      )}
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

  const { data: instructors, isLoading: instructorsLoading, error: instructorsError } = useInstructors();
  const { data: links, isLoading: linksLoading, error: linksError } = useInstructorCohorts();
  const createLink = useCreateInstructorCohort();
  const removeLink = useRemoveInstructorCohort();
  const [selectedInstructorId, setSelectedInstructorId] = useState('');

  const isLoading = instructorsLoading || linksLoading;
  const loadError = instructorsError || linksError;
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
  if (loadError) {
    return (
      <div className="rounded border border-border bg-surface p-8 text-center text-sm font-semibold text-danger">
        {loadError.message}
      </div>
    );
  }

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
