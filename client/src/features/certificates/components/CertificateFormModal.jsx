import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { certificateFormSchema } from '../types';
import { useLearners } from '../../learners/hooks/useLearners';
import { useConfig } from '../../../contexts/ConfigContext';

const TYPE_OPTIONS = ['transfer_certificate', 'conduct', 'degree'];

export function CertificateFormModal({ onClose, onSubmit, submitting, submitError }) {
  const { t } = useConfig();
  const { data: learners } = useLearners();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ resolver: zodResolver(certificateFormSchema), defaultValues: { type: 'conduct' } });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-[420px] rounded border border-border bg-surface p-6"
      >
        <div className="mb-4 text-base font-bold text-ink-900">Issue Certificate</div>

        <Field label={t('learner')} error={errors.learner_id}>
          <select className="input" {...register('learner_id')}>
            <option value="">Select {t('learner').toLowerCase()}…</option>
            {(learners || []).map((learner) => (
              <option key={learner.id} value={learner.id}>
                {learner.first_name} {learner.last_name} ({learner.registry_no})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type" error={errors.type}>
          <select className="input" {...register('type')}>
            {TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </Field>
        <Field label="Certificate No." error={errors.certificate_no}>
          <input className="input" {...register('certificate_no')} placeholder="e.g. TC-2026-001" />
        </Field>
        <Field label="Issue Date" error={errors.issue_date}>
          <input type="date" className="input" {...register('issue_date')} />
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
            {submitting ? 'Issuing…' : 'Issue'}
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
