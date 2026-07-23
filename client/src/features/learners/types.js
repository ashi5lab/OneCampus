import { z } from 'zod';

// Mirrors server/modules/learners/controller.js's learnerCreateSchema — keep
// the two in sync if the API contract changes. `gender` isn't a real
// top-level column (it lives in the DB's `meta` JSONB) — it's here purely
// so the form has something to register/validate; LearnerFormModal folds it
// into `meta` before submitting.
export const learnerFormSchema = z.object({
  username: z.string().optional(),
  email: z.string().email('A valid email is required').optional().or(z.literal('')),
  registry_no: z.string().min(1, 'Registry number is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  cohort_id: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().optional()
  ),
  status: z.string().default('active'),
  gender: z.enum(['male', 'female', 'other', '']).optional()
});

export const learnerUpdateSchema = z.object({
  registry_no: z.string().min(1, 'Registry number is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  cohort_id: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().optional()
  ),
  status: z.string().default('active'),
  gender: z.enum(['male', 'female', 'other', '']).optional()
});
