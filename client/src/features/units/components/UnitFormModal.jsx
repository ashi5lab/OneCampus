import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { unitFormSchema } from '../types';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
export function UnitFormModal({ onClose, onSubmit, submitting, submitError, initialData = null }) {
  useBodyScrollLock();
  const isEdit = !!initialData;
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(unitFormSchema),
    defaultValues: initialData || {}
  });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-[420px] rounded border-2 border-accent bg-surface p-6 my-auto"
      >
        <div className="mb-4 text-base font-bold text-ink-900">
          {isEdit ? 'Edit' : 'Add'} Unit
        </div>

        <Field label="Name" error={errors.name}>
          <input className="input w-full" {...register('name')} placeholder="e.g. Science Department" />
        </Field>
        <Field label="Type" error={errors.type}>
          <input className="input w-full" {...register('type')} placeholder="e.g. department" />
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
