import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBorrowers, useIssueLoan } from '../hooks/useLibrary';

const issueSchema = z.object({
  book_id: z.coerce.number().int(),
  borrower_id: z.coerce.number().int(),
  due_date: z.string().min(1, 'Due date is required')
});

export function IssueLoanModal({ book, onClose }) {
  const { data: borrowers } = useBorrowers();
  const issueLoan = useIssueLoan();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ resolver: zodResolver(issueSchema), defaultValues: { book_id: book.id } });

  function onSubmit(values) {
    issueLoan.mutate(values, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="my-auto w-full max-w-[420px] rounded border border-border bg-surface p-6"
      >
        <div className="mb-4 text-base font-bold text-ink-900">Issue "{book.title}"</div>
        <input type="hidden" {...register('book_id')} />

        <Field label="Borrower" error={errors.borrower_id}>
          <select className="input" defaultValue="" {...register('borrower_id')}>
            <option value="" disabled>
              Choose a borrower…
            </option>
            {(borrowers || []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.username} ({b.role})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due Date" error={errors.due_date}>
          <input type="date" className="input" {...register('due_date')} />
        </Field>

        {issueLoan.error && <div className="mb-3 text-xs font-semibold text-danger">{issueLoan.error.message}</div>}

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
            disabled={issueLoan.isPending}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {issueLoan.isPending ? 'Issuing…' : 'Issue'}
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
