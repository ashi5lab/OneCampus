import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { leaveApplySchema } from '../types';
import { useApplyLeave } from '../hooks/useLeave';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
export function LeaveApplyModal({ onClose }) {
  useBodyScrollLock();
  const applyLeave = useApplyLeave();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(leaveApplySchema),
    defaultValues: { leave_type: 'personal', is_half_day: false }
  });

  const isHalfDay = watch('is_half_day');

  function onSubmit(values) {
    const payload = { ...values, half_day_period: values.is_half_day ? values.half_day_period : null };
    if (!payload.reason) delete payload.reason;
    applyLeave.mutate(payload, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="my-auto w-full max-w-[440px] rounded border-2 border-accent bg-surface p-6">
        <div className="mb-4 text-base font-bold text-ink-900">Apply for Leave</div>

        <Field label="Leave Type" error={errors.leave_type}>
          <select className="input w-full" {...register('leave_type')}>
            <option value="personal">Personal Leave</option>
            <option value="sick">Sick Leave</option>
          </select>
        </Field>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <Field label="Start Date" error={errors.start_date}>
            <input type="date" className="input w-full" {...register('start_date')} />
          </Field>
          <Field label="End Date" error={errors.end_date}>
            <input type="date" className="input w-full" {...register('end_date')} />
          </Field>
        </div>

        <label className="mb-3 flex items-center gap-2 text-[13px] text-ink-700">
          <input type="checkbox" {...register('is_half_day')} />
          This is a half-day leave
        </label>

        {isHalfDay && (
          <Field label="Half" error={errors.half_day_period}>
            <select className="input w-full" {...register('half_day_period')}>
              <option value="first_half">First Half</option>
              <option value="second_half">Second Half</option>
            </select>
          </Field>
        )}

        <Field label="Reason (optional)" error={errors.reason}>
          <textarea className="input w-full" rows={3} {...register('reason')} placeholder="Briefly explain the reason for this leave…" />
        </Field>

        {applyLeave.error && <div className="mb-3 text-xs font-semibold text-danger">{applyLeave.error.message}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={applyLeave.isPending}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {applyLeave.isPending ? 'Submitting…' : 'Submit Request'}
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
