import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { instructorFormSchema, instructorUpdateSchema } from '../types';
import { useConfig } from '../../../contexts/ConfigContext';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
export function InstructorFormModal({ onClose, onSubmit, submitting, submitError, initialData = null }) {
  useBodyScrollLock();
  const { t } = useConfig();
  const isEdit = !!initialData;
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(isEdit ? instructorUpdateSchema : instructorFormSchema),
    defaultValues: initialData ? { ...initialData, gender: initialData.meta?.gender || '' } : {}
  });

  // `meta` is a JSONB grab-bag — merge the new gender into whatever was
  // already there instead of overwriting it (previously this form never
  // sent `meta` at all, so every edit silently reset it to {}).
  function handleFormSubmit({ gender, ...values }) {
    onSubmit({ ...values, meta: { ...(initialData?.meta || {}), gender: gender || undefined } });
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="w-full max-w-[420px] rounded border-2 border-accent bg-surface p-6 my-auto"
      >
        <div className="mb-4 text-base font-bold text-ink-900">
          {isEdit ? 'Edit' : 'Add'} {t('instructor')}
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
        <Field label="Staff ID" error={errors.staff_id}>
          <input className="input w-full" {...register('staff_id')} />
        </Field>
        <Field label="First Name" error={errors.first_name}>
          <input className="input w-full" {...register('first_name')} />
        </Field>
        <Field label="Last Name" error={errors.last_name}>
          <input className="input w-full" {...register('last_name')} />
        </Field>
        <Field label="Phone (optional)" error={errors.phone}>
          <input className="input w-full" {...register('phone')} />
        </Field>
        <Field label="Gender (optional)" error={errors.gender}>
          <select className="input w-full" {...register('gender')}>
            <option value="">Unspecified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
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
