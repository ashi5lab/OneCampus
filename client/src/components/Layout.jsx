import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-bg font-body text-ink-900 md:grid md:h-screen md:grid-cols-[248px_1fr] md:overflow-hidden">
      {/* Mobile Header — painted in --sidebar-bg (same token as the nav
          drawer) and extended under the status bar via env(safe-area-inset-
          top) padding, so the two form one continuous full-bleed colored
          bar from the very top of the screen down through the title, the
          way native apps (e.g. Outlook) do it — rather than a separate
          white/bordered card sitting on top of the page. See
          ConfigContext.jsx for the matching theme-color/status-bar-style
          updates that keep the OS status bar icons legible against
          whichever theme is active. */}
      <div
        className="flex items-center justify-between bg-sidebar-bg px-4 pb-3 text-sidebar-textStrong md:hidden"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="text-[15px] font-semibold tracking-tight">OneCampus</div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded p-2 text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-textStrong"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Its own scroll container — the sidebar is pinned/scrolls independently
          (see Sidebar.jsx's overflow-y-auto), so a long page here shouldn't
          drag the nav out of view with it. Bottom padding grows past
          env(safe-area-inset-bottom) on iPhones with no home button, so the
          last bit of content isn't sitting behind the home indicator. */}
      <div
        className="mx-auto w-full max-w-[1180px] px-4 py-4 sm:px-6 md:overflow-y-auto md:px-9 md:py-7"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <Outlet />
      </div>
    </div>
  );
}
