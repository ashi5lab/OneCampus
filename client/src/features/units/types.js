import { z } from 'zod';

// Mirrors server/modules/units/controller.js's unitSchema.
export const unitFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required')
});
