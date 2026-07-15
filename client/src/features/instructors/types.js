import { z } from 'zod';

// Mirrors server/modules/instructors/controller.js's instructorCreateSchema.
export const instructorFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  staff_id: z.string().min(1, 'Staff ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional()
});
