import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useConfig } from '../../../contexts/ConfigContext';
import { useModules } from '../../modules/hooks/useModules';
import { useCohorts } from '../../cohorts/hooks/useCohorts';

const assignmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  module_id: z.coerce.number().int({ message: 'Choose a subject' }),
  cohort_id: z.coerce.number().int({ message: 'Choose a class' }),
  due_date: z.string().min(1, 'Due date is required'),
  max_score: z.coerce.number().default(100)
});

export function AssignmentFormModal({ onClose, onSubmit, submitting, submitError, initialData = null }) {
  const { t } = useConfig();
  const { data: modules } = useModules();
  const { data: cohorts } = useCohorts();
  const isEdit = !!initialData;
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: initialData || { max_score: 100 }
  });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="my-auto w-full max-w-[440px] rounded border border-border bg-surface p-6"
      >
        <div className="mb-4 text-base font-bold text-ink-900">{isEdit ? 'Edit' : 'Post'} Assignment</div>

        <Field label="Title" error={errors.title}>
          <input className="input" {...register('title')} placeholder="e.g. Chapter 5 Problem Set" />
        </Field>
        <Field label={t('topic')} error={errors.module_id}>
          <select className="input" defaultValue="" {...register('module_id')}>
            <option value="" disabled>
              Choose one…
            </option>
            {(modules || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('cohort')} error={errors.cohort_id}>
          <select className="input" defaultValue="" {...register('cohort_id')}>
            <option value="" disabled>
              Choose one…
            </option>
            {(cohorts || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due Date" error={errors.due_date}>
          <input type="date" className="input" {...register('due_date')} />
        </Field>
        <Field label="Max Score" error={errors.max_score}>
          <input type="number" className="input" {...register('max_score')} />
        </Field>
        <Field label="Description (optional)" error={errors.description}>
          <textarea rows={4} className="input" {...register('description')} />
        </Field>

        {submitError && <div className="mb-3 text-xs font-semibold text-danger">{submitError}</div>}

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
