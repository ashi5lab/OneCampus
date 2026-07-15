import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useConfig } from '../../../contexts/ConfigContext';
import { useUnits } from '../../units/hooks/useUnits';
import { moduleFormSchema } from '../types';

export function ModuleFormModal({ onClose, onSubmit, submitting, submitError }) {
  const { t } = useConfig();
  const { data: units } = useUnits();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ resolver: zodResolver(moduleFormSchema) });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-[420px] rounded border border-border bg-surface p-6"
      >
        <div className="mb-4 text-base font-bold text-ink-900">Add {t('topic')}</div>

        <Field label="Name" error={errors.name}>
          <input className="input" {...register('name')} placeholder="e.g. Physics" />
        </Field>
        <Field label="Code" error={errors.code}>
          <input className="input" {...register('code')} placeholder="e.g. PHY101" />
        </Field>
        <Field label="Unit" error={errors.unit_id}>
          <select className="input" {...register('unit_id')}>
            <option value="">None</option>
            {(units || []).map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Credits" error={errors.credits}>
          <input type="number" className="input" {...register('credits')} placeholder="0" />
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
