import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-bg font-body text-ink-900 md:grid md:h-screen md:grid-cols-[248px_1fr] md:overflow-hidden">
      {/* Mobile Header — deliberately has no background/border of its own so
          it reads as part of the page (bg-bg, inherited from the wrapper
          below) instead of a separate white card sitting on top of it; a
          native iOS/Android top bar isn't a bordered box, it's the same
          surface as the status bar and the content beneath it (see
          index.html's theme-color, which matches --bg for the same reason).
          pt uses env(safe-area-inset-top) so this doesn't render under the
          status bar/notch when installed as a standalone PWA on iOS (see
          Sidebar.jsx for the matching drawer fix). */}
      <div
        className="flex items-center justify-between px-4 pb-3 md:hidden"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="text-[15px] font-semibold tracking-tight">OneCampus</div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded p-2 text-ink-500 hover:bg-surface-muted hover:text-ink-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Its own scroll container — the sidebar is pinned/scrolls independently
          (see Sidebar.jsx's overflow-y-auto), so a long page here shouldn't
          drag the nav out of view with it. */}
      <div className="mx-auto w-full max-w-[1180px] px-4 py-4 sm:px-6 md:overflow-y-auto md:px-9 md:py-7">
        <Outlet />
      </div>
    </div>
  );
}
