import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequirePermission } from './RequirePermission';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Regression test for a real bug: roster-only pages (Learners, Guardians,
// etc.) relied only on the sidebar hiding their nav link, so a role
// without the page's .view permission could navigate to the URL directly
// and see a stale/broken page instead of a clean denial. See App.jsx.
describe('RequirePermission', () => {
  it('renders children when the caller has the required permission', () => {
    useAuth.mockReturnValue({ can: (perm) => perm === 'guardians.view' });

    render(
      <RequirePermission permission="guardians.view">
        <div>Guardian roster</div>
      </RequirePermission>
    );

    expect(screen.getByText('Guardian roster')).toBeInTheDocument();
  });

  it('renders an access-denied message instead of children when the caller lacks the permission', () => {
    useAuth.mockReturnValue({ can: () => false });

    render(
      <RequirePermission permission="guardians.view">
        <div>Guardian roster</div>
      </RequirePermission>
    );

    expect(screen.queryByText('Guardian roster')).not.toBeInTheDocument();
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });
});
