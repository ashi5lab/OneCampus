import { z } from 'zod';

// Mirrors server/modules/learners/controller.js's learnerSchema — keep the
// two in sync if the API contract changes.
export const learnerFormSchema = z.object({
  user_id: z.coerce.number().int(),
  registry_no: z.string().min(1, 'Registry number is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  cohort_id: z.union([z.coerce.number().int(), z.literal('')]).optional(),
  status: z.string().default('active')
});
