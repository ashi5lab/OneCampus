import { z } from 'zod';

// Mirrors server/modules/evaluations/controller.js's evaluationSchema.
export const evaluationFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  time_block: z.string().min(1, 'Time block is required'),
  type: z.enum(['exam', 'activity_log', 'project'])
});

// Mirrors server/modules/evaluations/controller.js's scheduleSchema.
export const scheduleFormSchema = z.object({
  module_id: z.coerce.number().int(),
  eval_date: z.string().min(1, 'Date is required'),
  max_score: z.coerce.number().default(100),
  passing_score: z.coerce.number().default(40)
});
