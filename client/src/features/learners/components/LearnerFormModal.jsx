import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { learnerFormSchema } from '../types';
import { useConfig } from '../../../contexts/ConfigContext';

export function LearnerFormModal({ onClose, onSubmit, submitting, submitError }) {
  const { t } = useConfig();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ resolver: zodResolver(learnerFormSchema), defaultValues: { status: 'active' } });

  function handleFormSubmit(values) {
    onSubmit({
      ...values,
      cohort_id: values.cohort_id ?? null
    });
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40">
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="w-[420px] rounded border border-border bg-surface p-6"
      >
        <div className="mb-4 text-base font-bold text-ink-900">Add {t('learner')}</div>

        <Field label="Username" error={errors.username}>
          <input className="input" {...register('username')} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" className="input" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password}>
          <input type="password" className="input" {...register('password')} />
        </Field>
        <Field label="Registry No." error={errors.registry_no}>
          <input className="input" {...register('registry_no')} />
        </Field>
        <Field label="First Name" error={errors.first_name}>
          <input className="input" {...register('first_name')} />
        </Field>
        <Field label="Last Name" error={errors.last_name}>
          <input className="input" {...register('last_name')} />
        </Field>
        <Field label="Cohort ID (optional)" error={errors.cohort_id}>
          <input type="number" className="input" {...register('cohort_id')} />
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
