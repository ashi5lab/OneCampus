import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useCohortTimetable, useMyCohorts, useMyTimetable, useCreatePeriod, useUpdatePeriod, useDeletePeriod } from '../hooks/useTimetable';
import { PeriodFormModal } from './PeriodFormModal';
import { PeriodGrid } from './PeriodGrid';
import { PageHeader } from '../../../components/PageHeader';

export function TimetablePage() {
  const { can, user } = useAuth();
  const canManage = can('timetable.manage');
  const isInstructor = user?.role === 'instructor';
  const isSelfScoped = user?.role === 'learner' || user?.role === 'guardian';

  // A cohort's "Timetable" module tile (see CohortDetailPage) deep-links
  // here with ?cohort=<id> — preselect it and jump straight to the class
  // tab, rather than defaulting to "mine"/the first cohort alphabetically.
  const [searchParams] = useSearchParams();
  const cohortParam = Number(searchParams.get('cohort')) || null;

  const [tab, setTab] = useState(cohortParam ? 'class' : isInstructor ? 'mine' : 'class');
  const [selectedCohortId, setSelectedCohortId] = useState(cohortParam);
  const [modalState, setModalState] = useState(null); // { period, prefill, cohortId } | null

  const { data: allCohorts } = useCohorts({ enabled: !isSelfScoped });
  const { data: myCohorts } = useMyCohorts({ enabled: isSelfScoped });
  const classOptions = isSelfScoped
    ? (myCohorts || []).map((c) => ({
        value: c.cohort_id,
        label: c.learner_first_name ? `${c.learner_first_name} ${c.learner_last_name} — ${c.cohort_name}` : c.cohort_name
      }))
    : (allCohorts || []).map((c) => ({ value: c.id, label: c.name }));

  useEffect(() => {
    if (!selectedCohortId && classOptions.length > 0) setSelectedCohortId(classOptions[0].value);
  }, [classOptions, selectedCohortId]);

  const selectedCohort = (allCohorts || []).find((c) => c.id === selectedCohortId);

  const { data: classPeriods, isLoading: classLoading } = useCohortTimetable(selectedCohortId, { enabled: tab === 'class' });
  const { data: myPeriods, isLoading: mineLoading } = useMyTimetable({ enabled: isInstructor && tab === 'mine' });

  const createPeriod = useCreatePeriod();
  const updatePeriod = useUpdatePeriod();
  const deletePeriod = useDeletePeriod();

  function closeModal() {
    setModalState(null);
  }

  function handleSubmit(values) {
    const payload = { ...values, cohort_id: modalState.cohortId };
    if (modalState.period) {
      updatePeriod.mutate({ id: modalState.period.id, payload }, { onSuccess: closeModal });
    } else {
      createPeriod.mutate(payload, { onSuccess: closeModal });
    }
  }

  function handleDelete() {
    if (!modalState?.period) return;
    if (window.confirm('Delete this period?')) {
      deletePeriod.mutate(modalState.period.id, { onSuccess: closeModal });
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Timetable"
        title="Class Timetable"
        tabs={
          isInstructor && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTab('mine')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${tab === 'mine' ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'}`}
              >
                My Schedule
              </button>
              <button
                onClick={() => setTab('class')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${tab === 'class' ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'}`}
              >
                By Class
              </button>
            </div>
          )
        }
      />

      {tab === 'mine' && isInstructor && (
        <PeriodGrid
          periods={myPeriods}
          isLoading={mineLoading}
          canEdit={false}
          onCellClick={() => {}}
          onEmptyCellClick={() => {}}
          renderCell={(p) => (
            <>
              <div className="font-semibold text-ink-900">{p.module_name}</div>
              <div className="text-ink-500">{p.cohort_name}</div>
            </>
          )}
        />
      )}

      {tab === 'class' && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-ink-700">Class</div>
              <select
                className="input min-w-[220px]"
                value={selectedCohortId || ''}
                onChange={(e) => setSelectedCohortId(Number(e.target.value))}
              >
                {classOptions.length === 0 && <option value="">No classes available</option>}
                {classOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {canManage && selectedCohortId && (
              <button
                onClick={() => setModalState({ period: null, prefill: null, cohortId: selectedCohortId })}
                className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
              >
                + Add Period
              </button>
            )}
          </div>

          <PeriodGrid
            periods={classPeriods}
            isLoading={classLoading}
            canEdit={canManage}
            onCellClick={(period) => setModalState({ period, prefill: null, cohortId: selectedCohortId })}
            onEmptyCellClick={(prefill) => setModalState({ period: null, prefill, cohortId: selectedCohortId })}
            renderCell={(p) => (
              <>
                <div className="font-semibold text-ink-900">{p.module_name}</div>
                <div className="text-ink-500">
                  {p.instructor_first_name} {p.instructor_last_name}
                </div>
              </>
            )}
          />
        </>
      )}

      {modalState && (
        <PeriodFormModal
          initialData={modalState.period}
          prefill={modalState.prefill}
          defaultTimeBlock={selectedCohort?.time_block}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onDelete={modalState.period ? handleDelete : null}
          submitting={createPeriod.isPending || updatePeriod.isPending}
          submitError={createPeriod.error?.message || updatePeriod.error?.message}
        />
      )}
    </div>
  );
}
