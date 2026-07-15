import { z } from 'zod';

// Mirrors server/modules/certificates/controller.js's issueSchema.
export const certificateFormSchema = z.object({
  learner_id: z.coerce.number().int(),
  type: z.enum(['transfer_certificate', 'conduct', 'degree']),
  certificate_no: z.string().min(1, 'Certificate number is required'),
  issue_date: z.string().min(1, 'Issue date is required')
});
