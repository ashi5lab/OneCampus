import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useCohortTimetable, useCreatePeriod, useUpdatePeriod, useDeletePeriod } from '../hooks/useTimetable';
import { PeriodFormModal } from './PeriodFormModal';
import { PeriodGrid } from './PeriodGrid';

// The Class channel's Timetable tab — always locked to this one cohort, no
// "pick a class" selector (that's what the full page at /app/timetable,
// reached from More, is for). Anyone who can already manage timetables
// tenant-wide (timetable.manage) can add/edit periods here too, scoped to
// this cohort by default.
export function ClassTimetableTab({ cohortId, cohortTimeBlock }) {
  const { can } = useAuth();
  const canManage = can('timetable.manage');
  const { data: periods, isLoading } = useCohortTimetable(cohortId);
  const [modalState, setModalState] = useState(null); // { period, prefill } | null

  const createPeriod = useCreatePeriod();
  const updatePeriod = useUpdatePeriod();
  const deletePeriod = useDeletePeriod();

  function closeModal() {
    setModalState(null);
  }

  function handleSubmit(values) {
    const payload = { ...values, cohort_id: cohortId };
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
      {canManage && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setModalState({ period: null, prefill: null })}
            className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Add Period
          </button>
        </div>
      )}

      <PeriodGrid
        periods={periods}
        isLoading={isLoading}
        canEdit={canManage}
        onCellClick={(period) => setModalState({ period, prefill: null })}
        onEmptyCellClick={(prefill) => setModalState({ period: null, prefill })}
        renderCell={(p) => (
          <>
            <div className="font-semibold text-ink-900">{p.module_name}</div>
            <div className="text-ink-500">
              {p.instructor_first_name} {p.instructor_last_name}
            </div>
          </>
        )}
      />

      {modalState && (
        <PeriodFormModal
          initialData={modalState.period}
          prefill={modalState.prefill}
          defaultTimeBlock={cohortTimeBlock}
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
