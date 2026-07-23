import { z } from 'zod';

// Mirrors server/modules/staff/controller.js's staffCreateSchema.
export const staffFormSchema = z.object({
  username: z.string().optional(),
  email: z.string().email('A valid email is required').optional().or(z.literal('')),
  staff_id: z.string().min(1, 'Staff ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional()
});

export const staffUpdateSchema = z.object({
  staff_id: z.string().min(1, 'Staff ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional()
});
