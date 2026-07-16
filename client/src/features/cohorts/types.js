import { z } from 'zod';

// Mirrors server/modules/cohorts/controller.js's cohortSchema.
export const cohortFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  unit_id: z.coerce.number().int(),
  time_block: z.string().min(1, 'Time block is required'),
  advisor_id: z.coerce.number().int().optional().nullable()
});
