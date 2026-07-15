import { describe, it, expect } from 'vitest';
import { learnerFormSchema } from './types';

const validBase = {
  username: 'jdoe',
  email: 'jdoe@example.com',
  password: 'password123',
  registry_no: 'REG-001',
  first_name: 'Jane',
  last_name: 'Doe'
};

describe('learnerFormSchema cohort_id preprocessing', () => {
  it('treats an empty-string cohort_id (unselected dropdown) as not provided, not 0', () => {
    const result = learnerFormSchema.safeParse({ ...validBase, cohort_id: '' });
    expect(result.success).toBe(true);
    expect(result.data.cohort_id).toBeUndefined();
  });

  it('coerces a selected cohort_id string to a number', () => {
    const result = learnerFormSchema.safeParse({ ...validBase, cohort_id: '3' });
    expect(result.success).toBe(true);
    expect(result.data.cohort_id).toBe(3);
  });

  it('rejects a non-integer cohort_id', () => {
    const result = learnerFormSchema.safeParse({ ...validBase, cohort_id: 'abc' });
    expect(result.success).toBe(false);
  });
});
