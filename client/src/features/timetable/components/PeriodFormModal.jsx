import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useModules } from '../../modules/hooks/useModules';
import { useInstructors } from '../../instructors/hooks/useInstructors';
import { periodFormSchema, DAY_NAMES, DAY_ABBR } from '../types';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
function toFormDefaults(initialData, defaultTimeBlock, prefill) {
  if (!initialData) {
    return {
      module_id: '',
      instructor_id: '',
      days: prefill?.day ? [prefill.day] : [],
      start_time: prefill?.hour?.split('-')[0] || '',
      end_time: prefill?.hour?.split('-')[1] || '',
      time_block: defaultTimeBlock || '',
      start_date: '',
      end_date: ''
    };
  }
  const [start_time, end_time] = (initialData.schedule_data?.hour || '-').split('-');
  return {
    module_id: initialData.module_id,
    instructor_id: initialData.instructor_id,
    days: initialData.schedule_data?.days || [],
    start_time,
    end_time,
    time_block: initialData.time_block,
    start_date: initialData.start_date?.slice(0, 10) || '',
    end_date: initialData.end_date?.slice(0, 10) || ''
  };
}

export function PeriodFormModal({ onClose, onSubmit, onDelete, submitting, submitError, initialData = null, defaultTimeBlock, prefill }) {
  useBodyScrollLock();
  const isEdit = !!initialData;
  const { data: modules } = useModules();
  const { data: instructors } = useInstructors();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(periodFormSchema),
    defaultValues: toFormDefaults(initialData, defaultTimeBlock, prefill)
  });

  const days = watch('days') || [];

  function toggleDay(day) {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    setValue('days', next, { shouldValidate: true });
  }

  function submit(values) {
    const payload = {
      module_id: Number(values.module_id),
      instructor_id: Number(values.instructor_id),
      days: values.days,
      hour: `${values.start_time}-${values.end_time}`,
      time_block: values.time_block,
      start_date: values.start_date || null,
      end_date: values.end_date || null
    };
    onSubmit(payload);
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <form
        onSubmit={handleSubmit(submit)}
        className="my-auto max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded border-2 border-accent bg-surface p-6"
      >
        <div className="mb-4 text-base font-bold text-ink-900">{isEdit ? 'Edit' : 'Add'} Period</div>

        <Field label="Subject / Course" error={errors.module_id}>
          <select className="input" {...register('module_id', { valueAsNumber: true })}>
            <option value="" disabled>
              Select…
            </option>
            {(modules || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Teacher" error={errors.instructor_id}>
          <select className="input" {...register('instructor_id', { valueAsNumber: true })}>
            <option value="" disabled>
              Select…
            </option>
            {(instructors || []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.first_name} {i.last_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Days" error={errors.days}>
          <div className="flex flex-wrap gap-1.5">
            {DAY_NAMES.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                  days.includes(day) ? 'bg-accent text-accent-ink' : 'border border-border text-ink-700'
                }`}
              >
                {DAY_ABBR[day]}
              </button>
            ))}
          </div>
        </Field>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <Field label="Start Time" error={errors.start_time}>
            <input type="time" className="input w-full" {...register('start_time')} />
          </Field>
          <Field label="End Time" error={errors.end_time}>
            <input type="time" className="input w-full" {...register('end_time')} />
          </Field>
        </div>

        <Field label="Time Block (term/semester)" error={errors.time_block}>
          <input className="input" {...register('time_block')} placeholder="e.g. 2026-2027" />
        </Field>

        <div className="mb-1 grid grid-cols-2 gap-3">
          <Field label="From (optional)" error={errors.start_date}>
            <input type="date" className="input w-full" {...register('start_date')} />
          </Field>
          <Field label="Until (optional)" error={errors.end_date}>
            <input type="date" className="input w-full" {...register('end_date')} />
          </Field>
        </div>
        <div className="mb-3 text-[11px] text-ink-500">Leave both blank to repeat for the entire time block.</div>

        {submitError && <div className="mb-3 text-xs font-semibold text-danger">{submitError}</div>}

        <div className="mt-4 flex items-center justify-between gap-2">
          {isEdit && onDelete ? (
            <button type="button" onClick={onDelete} className="text-xs font-semibold text-danger hover:opacity-80">
              Delete Period
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700">
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
