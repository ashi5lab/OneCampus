import { z } from 'zod';

// Mirrors server/modules/leave/controller.js's createSchema.
export const leaveApplySchema = z
  .object({
    leave_type: z.enum(['personal', 'sick']),
    reason: z.string().optional(),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    is_half_day: z.boolean().optional().default(false),
    half_day_period: z.enum(['first_half', 'second_half']).optional().nullable()
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: 'End date must be on or after the start date',
    path: ['end_date']
  })
  .refine((data) => !data.is_half_day || data.start_date === data.end_date, {
    message: 'Half-day leave must be a single date (start = end)',
    path: ['end_date']
  });

export const LEAVE_TYPE_LABEL = { personal: 'Personal Leave', sick: 'Sick Leave' };
export const LEAVE_STATUS_LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };
