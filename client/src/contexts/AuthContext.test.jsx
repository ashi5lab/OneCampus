import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../lib/apiClient', () => ({
  apiClient: { get: vi.fn().mockResolvedValue({ data: { permissions: [] } }) },
  setAuthToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  logoutRequest: vi.fn()
}));

import { refreshAccessToken } from '../lib/apiClient';

function Probe() {
  const { initializing, isAuthenticated, user } = useAuth();
  if (initializing) return <div>initializing</div>;
  return <div>{isAuthenticated ? `logged in as ${user.username}` : 'logged out'}</div>;
}

// Regression test for a real bug: the mount-time silent session restore
// (trading the httpOnly refresh-token cookie for a fresh access token)
// treated a raw network failure exactly like a real "not logged in"
// rejection, clearing the session and bouncing the user to the login
// screen. On mobile this fired disproportionately often right after a
// hard-close/relaunch, when the OS is still reconnecting Wi-Fi/cellular —
// a transient failure with nothing to do with whether the session was
// actually still valid.
describe('AuthContext session restore', () => {
  beforeEach(() => {
    refreshAccessToken.mockReset();
  });

  // Real timers on purpose — mixing vi.useFakeTimers() with Testing
  // Library's waitFor() (which polls on its own timer) deadlocks, and the
  // component's retry delay isn't worth threading a fake-clock dependency
  // through just to shave ~1.2s off one test.
  it(
    'retries and recovers when refreshAccessToken fails with a raw network error, not a real rejection',
    async () => {
      const networkError = new TypeError('Failed to fetch'); // no `.status` — never got a response at all
      refreshAccessToken.mockRejectedValueOnce(networkError).mockResolvedValueOnce({
        token: 'tok',
        user: { id: 1, username: 'jane', role: 'instructor' }
      });

      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );

      expect(screen.getByText('initializing')).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText('logged in as jane')).toBeInTheDocument(), { timeout: 3000 });
      expect(refreshAccessToken).toHaveBeenCalledTimes(2);
    },
    5000
  );

  it('does not retry and logs out immediately on a real 401 rejection', async () => {
    const authError = Object.assign(new Error('Session expired'), { status: 401 });
    refreshAccessToken.mockRejectedValue(authError);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText('logged out')).toBeInTheDocument());
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });
});
