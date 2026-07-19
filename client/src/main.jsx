import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import './index.css';

// React Query's default (retry every failure 3x with exponential backoff)
// is only correct for transient failures — a 4xx from apiClient.js (bad
// input, missing permission, not found) is never going to succeed on
// retry, so retrying it just adds ~7s of visible delay before the error
// actually surfaces. This was silently making every permission-gated page
// feel "slow to respond" whenever a required migration/permission grant
// hadn't landed yet (the query would eventually settle into the right
// empty/error state, just several seconds later than it should have).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
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
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>
);
