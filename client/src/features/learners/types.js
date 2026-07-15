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
  // z.coerce.number() on '' would coerce to 0 (a valid, but wrong, cohort id)
  // before a union ever reaches a z.literal('') fallback — preprocess first
  // so an empty field becomes "not provided" instead of 0.
  cohort_id: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().optional()
  ),
  status: z.string().default('active')
});
