import { z } from 'zod';

// Mirrors server/modules/instructors/controller.js's instructorSchema.
export const instructorFormSchema = z.object({
  user_id: z.coerce.number().int(),
  staff_id: z.string().min(1, 'Staff ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional()
});
