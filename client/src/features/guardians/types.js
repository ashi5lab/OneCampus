import { z } from 'zod';

// Mirrors server/modules/guardians/controller.js's guardianCreateSchema.
export const guardianFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().min(1, 'Address is required'),
  whatsapp_opt_in: z.boolean().optional().default(false)
});

export const guardianUpdateSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().min(1, 'Address is required'),
  whatsapp_opt_in: z.boolean().optional().default(false)
});
