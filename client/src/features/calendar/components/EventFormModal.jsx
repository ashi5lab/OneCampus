import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { calendarEventSchema, WEEKDAY_LABELS } from '../types';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone' },
  { value: 'instructors', label: 'Instructors' },
  { value: 'learners', label: 'Learners' },
  { value: 'guardians', label: 'Guardians' }
];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function toFormDefaults(initialData) {
  if (!initialData) {
    return {
      title: '',
      description: '',
      event_type: 'event',
      start_date: '',
      end_date: '',
      is_recurring: false,
      recurrence_type: null,
      recurrence_days: [],
      recurrence_end_date: '',
      audience: 'all'
    };
  }
  return {
    title: initialData.title,
    description: initialData.description || '',
    event_type: initialData.event_type,
    start_date: initialData.start_date?.slice(0, 10) || '',
    end_date: initialData.end_date?.slice(0, 10) || '',
    is_recurring: initialData.is_recurring,
    recurrence_type: initialData.recurrence_type || null,
    recurrence_days: initialData.recurrence_days || [],
    recurrence_end_date: initialData.recurrence_end_date?.slice(0, 10) || '',
    audience: initialData.audience
  };
}

export function EventFormModal({ onClose, onSubmit, submitting, submitError, initialData = null }) {
  const isEdit = !!initialData;
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(calendarEventSchema),
    defaultValues: toFormDefaults(initialData)
  });

  const eventType = watch('event_type');
  const isRecurring = watch('is_recurring');
  const recurrenceType = watch('recurrence_type');
  const recurrenceDays = watch('recurrence_days') || [];

  function toggleDay(day) {
    const next = recurrenceDays.includes(day) ? recurrenceDays.filter((d) => d !== day) : [...recurrenceDays, day].sort((a, b) => a - b);
    setValue('recurrence_days', next, { shouldValidate: true });
  }

  function submit(values) {
    const payload = { ...values };
    if (!payload.description) delete payload.description;
    if (!payload.is_recurring) {
      payload.recurrence_type = null;
      payload.recurrence_days = [];
      delete payload.recurrence_end_date;
      // An untouched "End Date (optional)" field submits '' (react-hook-form
      // never leaves it undefined) — the backend's zod schema only treats
      // end_date as optional when the key is absent/undefined, not ''.
      if (!payload.end_date) delete payload.end_date;
    } else {
      delete payload.end_date;
      if (payload.recurrence_type === 'yearly') payload.recurrence_days = [];
      if (!payload.recurrence_end_date) delete payload.recurrence_end_date;
    }
    onSubmit(payload);
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <form
        onSubmit={handleSubmit(submit)}
        className="my-auto max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded border border-border bg-surface p-6"
      >
        <div className="mb-4 text-base font-bold text-ink-900">{isEdit ? 'Edit' : 'Add'} Event / Holiday</div>

        <Field label="Title" error={errors.title}>
          <input className="input" {...register('title')} placeholder="e.g. Republic Day" />
        </Field>

        <Field label="Description (optional)" error={errors.description}>
          <textarea rows={2} className="input" {...register('description')} />
        </Field>

        <div className="mb-3 flex gap-2">
          {[
            { value: 'event', label: 'Event' },
            { value: 'holiday', label: 'Holiday' }
          ].map((opt) => (
            <label
              key={opt.value}
              className={`flex-1 cursor-pointer rounded border px-3 py-2 text-center text-xs font-semibold ${
                eventType === opt.value ? 'border-accent bg-accent/10 text-accent-dark' : 'border-border text-ink-700'
              }`}
            >
              <input type="radio" value={opt.value} className="hidden" {...register('event_type')} />
              {opt.label}
            </label>
          ))}
        </div>

        <label className="mb-3 flex items-center gap-2 text-[13px] text-ink-700">
          <input type="checkbox" {...register('is_recurring')} />
          This repeats
        </label>

        {!isRecurring && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Field label="Start Date" error={errors.start_date}>
              <input type="date" className="input w-full" {...register('start_date')} />
            </Field>
            <Field label="End Date (optional)" error={errors.end_date}>
              <input type="date" className="input w-full" {...register('end_date')} />
            </Field>
          </div>
        )}

        {isRecurring && (
          <div className="mb-3 rounded border border-border bg-surface-muted p-3">
            <Field label="Starts On" error={errors.start_date}>
              <input type="date" className="input w-full" {...register('start_date')} />
            </Field>

            <Field label="Repeats" error={errors.recurrence_type}>
              <select className="input" {...register('recurrence_type')}>
                <option value="">Select…</option>
                <option value="weekly">Weekly, on selected days</option>
                <option value="monthly">Monthly, on selected day(s)</option>
                <option value="yearly">Yearly, on the start date</option>
              </select>
            </Field>

            {recurrenceType === 'weekly' && (
              <Field label="Days of Week" error={errors.recurrence_days}>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_LABELS.map((label, day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`h-8 w-8 rounded-full text-[11px] font-semibold ${
                        recurrenceDays.includes(day) ? 'bg-accent text-accent-ink' : 'border border-border text-ink-700'
                      }`}
                    >
                      {label[0]}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {recurrenceType === 'monthly' && (
              <Field label="Day(s) of Month" error={errors.recurrence_days}>
                <div className="grid grid-cols-7 gap-1.5">
                  {MONTH_DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`h-8 rounded text-[11px] font-semibold ${
                        recurrenceDays.includes(day) ? 'bg-accent text-accent-ink' : 'border border-border text-ink-700'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <Field label="Ends On (optional — repeats for 2 years if left blank)" error={errors.recurrence_end_date}>
              <input type="date" className="input w-full" {...register('recurrence_end_date')} />
            </Field>
          </div>
        )}

        <Field label="Audience" error={errors.audience}>
          <select className="input" {...register('audience')}>
            {AUDIENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>

        {submitError && <div className="mb-3 text-xs font-semibold text-danger">{submitError}</div>}

        <div className="mt-4 flex justify-end gap-2">
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
