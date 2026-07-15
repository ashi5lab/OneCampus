import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-bg font-body text-ink-900 md:grid md:grid-cols-[248px_1fr]">
      {/* Mobile Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
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
      
      <div className="mx-auto w-full max-w-[1180px] px-4 py-4 sm:px-6 md:px-9 md:py-7">
        <Outlet />
      </div>
    </div>
  );
}
