import { useState } from 'react';
import { useWaiveFine } from '../hooks/useLibrary';

// Sets the loan's total waived amount — an overwrite, not additive (see
// server/modules/library/README.md) — so the field starts pre-filled with
// whatever's already been waived, not zero, and "Waive full amount" fills
// in the current raw fine rather than adding to an existing waiver.
export function WaiveFineModal({ loan, onClose }) {
  const waiveFine = useWaiveFine();
  const [amount, setAmount] = useState(String(loan.fine_waived_amount || 0));
  const [reason, setReason] = useState(loan.fine_waived_reason || '');

  function handleSubmit(e) {
    e.preventDefault();
    waiveFine.mutate(
      { id: loan.id, payload: { waived_amount: Number(amount) || 0, reason: reason || null } },
      { onSuccess: () => onClose() }
    );
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="w-full max-w-[400px] rounded border border-border bg-surface p-6 my-auto">
        <div className="mb-1 text-base font-bold text-ink-900">Waive Fine</div>
        <div className="mb-4 text-[12.5px] text-ink-500">
          {loan.book_title} — {loan.borrower_username} · {loan.days_overdue} day{loan.days_overdue === 1 ? '' : 's'} overdue, {loan.fine_amount} total
        </div>

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Waived Amount</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              className="input w-full"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setAmount(String(loan.fine_amount))}
              className="whitespace-nowrap rounded border border-border px-2.5 py-2 text-[11.5px] font-semibold text-ink-700 hover:bg-surface-muted"
            >
              Full amount
            </button>
          </div>
        </label>

        <label className="mb-4 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Reason (optional)</div>
          <input className="input w-full" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>

        {waiveFine.error && <div className="mb-3 text-xs font-semibold text-danger">{waiveFine.error.message}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={waiveFine.isPending}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {waiveFine.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
