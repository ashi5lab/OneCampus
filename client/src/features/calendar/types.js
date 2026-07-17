import { z } from 'zod';

// Mirrors server/modules/calendar/controller.js's eventSchema.
export const calendarEventSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    event_type: z.enum(['event', 'holiday']).default('event'),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().optional(),
    is_recurring: z.boolean().default(false),
    recurrence_type: z.enum(['weekly', 'monthly', 'yearly']).optional().nullable(),
    recurrence_days: z.array(z.number().int()).optional().default([]),
    recurrence_end_date: z.string().optional(),
    audience: z.enum(['all', 'instructors', 'learners', 'guardians']).default('all')
  })
  .refine((d) => !d.is_recurring || !!d.recurrence_type, {
    message: 'Choose a recurrence pattern',
    path: ['recurrence_type']
  })
  .refine((d) => !d.is_recurring || d.recurrence_type === 'yearly' || d.recurrence_days.length > 0, {
    message: 'Choose at least one day',
    path: ['recurrence_days']
  })
  .refine((d) => d.is_recurring || !d.end_date || d.end_date >= d.start_date, {
    message: 'End date must be on or after the start date',
    path: ['end_date']
  });

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ITEM_TYPE_META = {
  holiday: { label: 'Holiday', dot: 'bg-danger' },
  event: { label: 'Event', dot: 'bg-accent' },
  notice: { label: 'Notice', dot: 'bg-[#2563EB]' },
  exam: { label: 'Exam', dot: 'bg-[#7C3AED]' },
  assignment: { label: 'Assignment', dot: 'bg-[#0F7A3D]' }
};
