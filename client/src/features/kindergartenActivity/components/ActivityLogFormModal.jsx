import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { activityLogFormSchema } from '../types';
import { useLearners } from '../../learners/hooks/useLearners';
import { useConfig } from '../../../contexts/ConfigContext';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
export function ActivityLogFormModal({ onClose, onSubmit, submitting, submitError }) {
  useBodyScrollLock();
  const { t } = useConfig();
  const { data: learners } = useLearners();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ resolver: zodResolver(activityLogFormSchema) });

  function handleFormSubmit(values) {
    onSubmit({
      ...values,
      activities: values.activities
        ? values.activities.split(',').map((a) => a.trim()).filter(Boolean)
        : []
    });
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40">
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="w-[420px] rounded border-2 border-accent bg-surface p-6"
      >
        <div className="mb-4 text-base font-bold text-ink-900">Log Daily Activity</div>

        <Field label={t('learner')} error={errors.learner_id}>
          <select className="input" {...register('learner_id')}>
            <option value="">Select {t('learner').toLowerCase()}…</option>
            {(learners || []).map((learner) => (
              <option key={learner.id} value={learner.id}>
                {learner.first_name} {learner.last_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date" error={errors.date}>
          <input type="date" className="input" {...register('date')} />
        </Field>
        <Field label="Meal Intake" error={errors.meal_intake}>
          <input className="input" {...register('meal_intake')} placeholder="e.g. Full lunch, snack" />
        </Field>
        <Field label="Sleep Duration" error={errors.sleep_duration}>
          <input className="input" {...register('sleep_duration')} placeholder="e.g. 1.5 hours" />
        </Field>
        <Field label="Activities (comma-separated)" error={errors.activities}>
          <input className="input" {...register('activities')} placeholder="e.g. painting, story time, outdoor play" />
        </Field>

        {submitError && (
          <div className="mb-3 text-xs font-semibold text-danger">{submitError}</div>
        )}

        <div className="mt-4 flex justify-end gap-2">
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
