import { z } from 'zod';

// Mirrors server/modules/learners/controller.js's learnerCreateSchema — keep
// the two in sync if the API contract changes.
export const learnerFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  registry_no: z.string().min(1, 'Registry number is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  cohort_id: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().optional()
  ),
  status: z.string().default('active')
});

export const learnerUpdateSchema = z.object({
  registry_no: z.string().min(1, 'Registry number is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  cohort_id: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().optional()
  ),
  status: z.string().default('active')
});
