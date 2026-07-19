import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { scheduleFormSchema } from '../types';
import { useModules } from '../../modules/hooks/useModules';
import { useConfig } from '../../../contexts/ConfigContext';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
export function ScheduleFormModal({ onClose, onSubmit, submitting, submitError }) {
  useBodyScrollLock();
  const { t } = useConfig();
  const { data: modules } = useModules();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ resolver: zodResolver(scheduleFormSchema), defaultValues: { max_score: 100, passing_score: 40 } });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-[420px] rounded border-2 border-accent bg-surface p-6"
      >
        <div className="mb-4 text-base font-bold text-ink-900">Add Schedule</div>

        <Field label={t('topic')} error={errors.module_id}>
          <select className="input" {...register('module_id')}>
            <option value="">Select {t('topic').toLowerCase()}…</option>
            {(modules || []).map((module) => (
              <option key={module.id} value={module.id}>{module.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Date" error={errors.eval_date}>
          <input type="date" className="input" {...register('eval_date')} />
        </Field>
        <Field label="Max Score" error={errors.max_score}>
          <input type="number" className="input" {...register('max_score')} />
        </Field>
        <Field label="Passing Score" error={errors.passing_score}>
          <input type="number" className="input" {...register('passing_score')} />
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
