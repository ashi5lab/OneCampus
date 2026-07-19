import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { guardianFormSchema, guardianUpdateSchema } from '../types';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
export function GuardianFormModal({ onClose, onSubmit, submitting, submitError, initialData = null }) {
  useBodyScrollLock();
  const isEdit = !!initialData;
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(isEdit ? guardianUpdateSchema : guardianFormSchema),
    defaultValues: initialData || {}
  });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-[420px] rounded border-2 border-accent bg-surface p-6 my-auto"
      >
        <div className="mb-4 text-base font-bold text-ink-900">
          {isEdit ? 'Edit' : 'Add'} Guardian
        </div>

        {!isEdit && (
          <>
            <Field label="Username" error={errors.username}>
              <input className="input w-full" {...register('username')} />
            </Field>
            <Field label="Email" error={errors.email}>
              <input type="email" className="input w-full" {...register('email')} />
            </Field>
            <Field label="Password" error={errors.password}>
              <input type="password" className="input w-full" {...register('password')} />
            </Field>
          </>
        )}
        <Field label="First Name" error={errors.first_name}>
          <input className="input w-full" {...register('first_name')} />
        </Field>
        <Field label="Last Name" error={errors.last_name}>
          <input className="input w-full" {...register('last_name')} />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <input className="input w-full" {...register('phone')} />
        </Field>
        <Field label="Address" error={errors.address}>
          <input className="input w-full" {...register('address')} />
        </Field>

        <label className="mb-3 flex items-start gap-2 text-[13px] text-ink-700">
          <input type="checkbox" className="mt-0.5" {...register('whatsapp_opt_in')} />
          <span>
            This guardian has agreed to receive WhatsApp notifications (attendance alerts, etc.) at the phone number above.
          </span>
        </label>

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
