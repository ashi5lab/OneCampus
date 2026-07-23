import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { BottomTabBar } from './BottomTabBar';
import { Topbar } from './Topbar';
import { useSocket } from '../contexts/SocketContext';

// No mobile header bar anymore — each page's own PageHeader (eyebrow/title/
// back icon) is the only title now, instead of duplicating it in a boxed
// bar above. Primary navigation on mobile lives in BottomTabBar, not a
// hamburger + drawer. The back button itself lives in PageHeader, inline
// with each page's title, not here — see PageHeader.jsx for why.
export function Layout() {
  const location = useLocation();
  const contentRef = useRef(null);
  const socket = useSocket();
  const queryClient = useQueryClient();

  // Client-side route changes don't reset scroll position the way a full
  // page load does. On mobile the document itself scrolls, but on desktop
  // it's this content pane's own overflow-y-auto — a scrollTop carried over
  // from a long previous page (e.g. a big roster) lands you mid-scroll on
  // whatever's next, with its heading pushed up above the visible area
  // ("cut off"). Resetting both on every navigation is what a normal
  // (non-SPA) page load would do for free.
  useEffect(() => {
    window.scrollTo(0, 0);
    contentRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  // Global socket listener for new direct messages
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
    };
    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [socket, queryClient]);

  return (
    <div className="flex min-h-screen flex-col bg-bg font-body text-ink-900 md:grid md:h-screen md:grid-cols-[248px_1fr] md:overflow-hidden">
      {/* Clears the status bar/notch on mobile now that there's no header
          bar to absorb env(safe-area-inset-top) itself. */}
      <div className="h-[env(safe-area-inset-top)] shrink-0 md:hidden" />

      <Sidebar />

      {/* min-w-0 lets this grid column shrink below its content's intrinsic
          width instead of overflowing the [248px_1fr] track on narrow
          desktop windows. Topbar sits outside the scroll container so it
          stays pinned while the page below it scrolls. */}
      <div className="flex min-w-0 flex-col md:h-screen md:overflow-hidden">
        <Topbar />

        {/* Its own scroll container — the sidebar is pinned/scrolls independently
            (see Sidebar.jsx's overflow-y-auto), so a long page here shouldn't
            drag the nav out of view with it. Bottom padding grows past
            env(safe-area-inset-bottom) and the bottom tab bar's height, so
            content never sits behind either. The inner wrapper caps line
            length on ultra-wide monitors without starving normal desktop/
            laptop widths the way the old 1180px cap did. */}
        <div ref={contentRef} className="md:flex-1 md:overflow-y-auto">
          <div
            className="mx-auto w-full max-w-[1600px] px-4 pb-4 pt-5 sm:px-6 md:px-9 md:py-7"
            style={{ paddingBottom: 'max(4.5rem, calc(3.75rem + env(safe-area-inset-bottom)))' }}
          >
            <Outlet />
          </div>
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}
