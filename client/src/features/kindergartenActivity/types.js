import { z } from 'zod';

// Mirrors server/modules/kindergartenActivity/controller.js's logSchema.
// activities is edited as a comma-separated string in the form and split
// into an array right before submit (see ActivityLogFormModal).
export const activityLogFormSchema = z.object({
  learner_id: z.coerce.number().int(),
  date: z.string().min(1, 'Date is required'),
  meal_intake: z.string().optional(),
  sleep_duration: z.string().optional(),
  activities: z.string().optional()
});
