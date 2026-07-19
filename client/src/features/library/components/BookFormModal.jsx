import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
const bookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().optional(),
  isbn: z.string().optional(),
  category: z.string().optional(),
  total_copies: z.coerce.number().int().min(1).default(1)
});

export function BookFormModal({ onClose, onSubmit, submitting, submitError, initialData = null }) {
  useBodyScrollLock();
  const isEdit = !!initialData;
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(bookSchema),
    defaultValues: initialData || { total_copies: 1 }
  });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="my-auto w-full max-w-[420px] rounded border-2 border-accent bg-surface p-6"
      >
        <div className="mb-4 text-base font-bold text-ink-900">{isEdit ? 'Edit' : 'Add'} Book</div>

        <Field label="Title" error={errors.title}>
          <input className="input" {...register('title')} />
        </Field>
        <Field label="Author" error={errors.author}>
          <input className="input" {...register('author')} />
        </Field>
        <Field label="ISBN" error={errors.isbn}>
          <input className="input" {...register('isbn')} />
        </Field>
        <Field label="Category" error={errors.category}>
          <input className="input" {...register('category')} />
        </Field>
        <Field label="Total Copies" error={errors.total_copies}>
          <input type="number" min="1" className="input" {...register('total_copies')} />
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
