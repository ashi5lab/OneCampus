import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cohortFormSchema } from '../types';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useUnits } from '../../units/hooks/useUnits';
import { useInstructors } from '../../instructors/hooks/useInstructors';
import { UserSearchSelect } from '../../../components/UserSearchSelect';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
export function CohortFormModal({ onClose, onSubmit, submitting, submitError, initialData = null, onDelete = null }) {
  useBodyScrollLock();
  const { t } = useConfig();
  const { can } = useAuth();
  const { data: units } = useUnits();
  const { data: instructors } = useInstructors({ enabled: can('instructors.view') });
  const isEdit = !!initialData;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(cohortFormSchema),
    defaultValues: initialData || {}
  });

  // advisor_id references onec_users, but the picker searches instructors —
  // map each instructor row to its user_id so the selected value lines up
  // with what the backend expects. `name` comes from the instructor row
  // directly; `username` is joined in by GET /instructors specifically for
  // pickers like this one (see server/modules/instructors/controller.js).
  const advisorOptions = (instructors || []).map((i) => ({
    id: i.user_id,
    username: i.username,
    name: `${i.first_name} ${i.last_name}`,
    role: 'instructor'
  }));

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-[420px] rounded border-2 border-accent bg-surface p-6 my-auto"
      >
        <div className="mb-4 text-base font-bold text-ink-900">
          {isEdit ? 'Edit' : 'Add'} {t('cohort')}
        </div>

        <Field label="Name" error={errors.name}>
          <input className="input w-full" {...register('name')} placeholder="e.g. Grade 9 - B" />
        </Field>
        <Field label="Unit" error={errors.unit_id}>
          <select className="input w-full" defaultValue="" {...register('unit_id')}>
            <option value="" disabled>
              Choose one…
            </option>
            {(units || []).map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Time Block" error={errors.time_block}>
          <input className="input w-full" {...register('time_block')} placeholder="e.g. 2026-2027" />
        </Field>
        <Field label="Class Teacher / Advisor (optional)" error={errors.advisor_id}>
          <Controller
            name="advisor_id"
            control={control}
            render={({ field }) => (
              <UserSearchSelect
                users={advisorOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Search teachers…"
              />
            )}
          />
        </Field>

        {submitError && (
          <div className="mb-3 text-xs font-semibold text-danger">{submitError}</div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          {isEdit && onDelete ? (
            <button type="button" onClick={onDelete} className="text-xs font-semibold text-danger hover:opacity-80">
              Delete class
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 text-xs font-semibold text-ink-700">{label}</div>
      {children}
      {error && <div className="mt-1 text-[11px] font-semibold text-danger">{error.message}</div>}
    </label>
  );
}
