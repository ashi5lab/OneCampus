import { z } from 'zod';

// Mirrors server/modules/modules/controller.js's moduleSchema.
export const moduleFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  // See learners/types.js's cohort_id for why this needs a preprocess step
  // rather than plain z.coerce.number().optional() — an empty select value
  // ('') would otherwise coerce to 0, a valid-looking but wrong unit id.
  unit_id: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().optional()
  ),
  credits: z.coerce.number().int().default(0)
});
