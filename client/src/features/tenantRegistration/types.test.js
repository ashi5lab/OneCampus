import { describe, it, expect } from 'vitest';
import { tenantRegistrationSchema } from './types';

const validBase = {
  org_name: 'Greenwood High',
  org_type: 'school',
  slug: 'greenwood',
  contact_name: 'Jane Doe',
  contact_phone: '+1 555 123 4567',
  contact_email: 'jane@greenwood.edu',
  admin_username: 'greenwood_admin',
  admin_password: 'secret123',
  admin_password_confirm: 'secret123'
};

describe('tenantRegistrationSchema', () => {
  it('accepts a fully valid registration', () => {
    const result = tenantRegistrationSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('rejects mismatched password confirmation', () => {
    const result = tenantRegistrationSchema.safeParse({ ...validBase, admin_password_confirm: 'different' });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.admin_password_confirm).toBeTruthy();
  });

  it('rejects an org_type outside kindergarten/school/college', () => {
    const result = tenantRegistrationSchema.safeParse({ ...validBase, org_type: 'university' });
    expect(result.success).toBe(false);
  });

  it.each(['Greenwood', 'green_wood', 'green wood', 'a'])(
    'rejects a slug that is not lowercase/numbers/hyphens or too short (%s)',
    (slug) => {
      const result = tenantRegistrationSchema.safeParse({ ...validBase, slug });
      expect(result.success).toBe(false);
    }
  );

  it('accepts a valid lowercase/hyphenated slug', () => {
    const result = tenantRegistrationSchema.safeParse({ ...validBase, slug: 'green-wood-2' });
    expect(result.success).toBe(true);
  });

  it('rejects a short phone number', () => {
    const result = tenantRegistrationSchema.safeParse({ ...validBase, contact_phone: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects a short admin password', () => {
    const result = tenantRegistrationSchema.safeParse({
      ...validBase,
      admin_password: 'abc',
      admin_password_confirm: 'abc'
    });
    expect(result.success).toBe(false);
  });
});
