import { z } from 'zod';

// Mirrors server/modules/platform/controller.js's registerSchema — keep in sync.
export const tenantRegistrationSchema = z
  .object({
    org_name: z.string().min(2, 'Organization name is required'),
    org_type: z.enum(['kindergarten', 'school', 'college'], {
      errorMap: () => ({ message: 'Choose an institution type' })
    }),
    slug: z
      .string()
      .min(2, 'Subdomain must be at least 2 characters')
      .max(63, 'Subdomain is too long')
      .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only'),
    contact_name: z.string().min(1, 'Contact name is required'),
    contact_phone: z.string().min(7, 'A valid phone number is required'),
    contact_email: z.string().email('A valid email is required'),
    admin_username: z.string().min(3, 'Username must be at least 3 characters'),
    admin_password: z.string().min(6, 'Password must be at least 6 characters'),
    admin_password_confirm: z.string()
  })
  .refine((data) => data.admin_password === data.admin_password_confirm, {
    message: 'Passwords do not match',
    path: ['admin_password_confirm']
  });
