import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ConfigProvider } from './contexts/ConfigContext';
// Side-effect import: registers the beforeinstallprompt/appinstalled
// listeners at module load, before any component (including the login
// form the install button lives on) has mounted — see lib/pwa.js's
// top-of-file comment for why this needs to happen this early.
import './lib/pwa';
import './index.css';

// React Query's default (retry every failure 3x with exponential backoff)
// is only correct for transient failures — a 4xx from apiClient.js (bad
// input, missing permission, not found) is never going to succeed on
// retry, so retrying it just adds ~7s of visible delay before the error
// actually surfaces. This was silently making every permission-gated page
// feel "slow to respond" whenever a required migration/permission grant
// hadn't landed yet (the query would eventually settle into the right
// empty/error state, just several seconds later than it should have).
//
// staleTime also defaults to 0, meaning every query is considered stale
// the instant it lands — so remounting a component (navigating away and
// back) or just refocusing the browser tab/PWA re-fetches everything all
// over again, even if the data is a few seconds old. Mutations already
// invalidate their specific query keys for immediate consistency after a
// user's own action (see e.g. useCreateLearner), so this only affects how
// quickly *other people's* changes show up passively — 30s is a small
// enough window that nobody notices, but it cuts out a lot of redundant
// requests (and Postgres round trips) from routine tab-switching/re-nav.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: (failureCount, error) => {
        if (error?.status >= 400 && error.status < 500) return false;
        return failureCount < 3;
      }
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>
);
