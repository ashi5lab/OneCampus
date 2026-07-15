import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SuperAdminProtectedRoute } from './SuperAdminProtectedRoute';
import { useSuperAdminAuth } from '../contexts/SuperAdminAuthContext';

vi.mock('../contexts/SuperAdminAuthContext', () => ({
  useSuperAdminAuth: vi.fn()
}));

// Mirrors RequirePermission's route-guard reasoning, applied to the super
// admin area: a super admin token is entirely separate from a tenant
// session (see contexts/SuperAdminAuthContext.jsx), so this guard must
// redirect on its own rather than relying on the tenant ProtectedRoute.
function renderGuardedRoute(authState) {
  useSuperAdminAuth.mockReturnValue(authState);

  return render(
    <MemoryRouter initialEntries={['/super-admin']}>
      <Routes>
        <Route path="/super-admin/login" element={<div>Login page</div>} />
        <Route
          path="/super-admin"
          element={
            <SuperAdminProtectedRoute>
              <div>Dashboard</div>
            </SuperAdminProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('SuperAdminProtectedRoute', () => {
  it('renders nothing while the initial auth check is still in flight', () => {
    renderGuardedRoute({ initializing: true, isAuthenticated: false });
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('redirects to /super-admin/login when not authenticated', () => {
    renderGuardedRoute({ initializing: false, isAuthenticated: false });
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('renders the protected children once authenticated', () => {
    renderGuardedRoute({ initializing: false, isAuthenticated: true });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
