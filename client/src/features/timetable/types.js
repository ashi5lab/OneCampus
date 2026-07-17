import { z } from 'zod';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_ABBR = { Sunday: 'Sun', Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

// Mirrors server/modules/timetable/controller.js's allocationSchema, minus
// cohort_id (fixed by whichever class's grid the form was opened from) and
// with start/end time as separate <input type="time"> fields instead of one
// combined "HH:MM-HH:MM" string — friendlier to fill in, joined back into
// the "hour" string the API expects right before submit.
export const periodFormSchema = z
  .object({
    module_id: z.number({ invalid_type_error: 'Choose a subject/course' }).int(),
    instructor_id: z.number({ invalid_type_error: 'Choose a teacher' }).int(),
    days: z.array(z.enum(DAY_NAMES)).min(1, 'Choose at least one day'),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
    time_block: z.string().min(1, 'Time block is required'),
    start_date: z.string().optional(),
    end_date: z.string().optional()
  })
  .refine((d) => d.end_time > d.start_time, { message: 'End time must be after start time', path: ['end_time'] })
  .refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, {
    message: 'End date must be on or after the start date',
    path: ['end_date']
  });
