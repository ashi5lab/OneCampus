import { describe, it, expect } from 'vitest';
import { moduleFormSchema } from './types';

const validBase = { name: 'Physics', code: 'PHY101' };

describe('moduleFormSchema unit_id preprocessing', () => {
  it('treats an empty-string unit_id (the "None" option) as not provided, not 0', () => {
    const result = moduleFormSchema.safeParse({ ...validBase, unit_id: '' });
    expect(result.success).toBe(true);
    expect(result.data.unit_id).toBeUndefined();
  });

  it('coerces a selected unit_id string to a number', () => {
    const result = moduleFormSchema.safeParse({ ...validBase, unit_id: '2' });
    expect(result.success).toBe(true);
    expect(result.data.unit_id).toBe(2);
  });

  it('defaults credits to 0 when omitted', () => {
    const result = moduleFormSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    expect(result.data.credits).toBe(0);
  });

  it('rejects a missing name or code', () => {
    expect(moduleFormSchema.safeParse({ code: 'PHY101' }).success).toBe(false);
    expect(moduleFormSchema.safeParse({ name: 'Physics' }).success).toBe(false);
  });
});
