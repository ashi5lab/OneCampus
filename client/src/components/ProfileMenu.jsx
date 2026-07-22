import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// The Dashboard header's account button — the initials circle that used to
// be decorative. Clicking it opens a small menu with Settings (→ the
// account/settings page at /app/profile) and Log out, since mobile's
// bottom tab bar has no Settings destination of its own.
export function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-ink transition active:scale-95"
      >
        {(user?.username || '?').slice(0, 2).toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/app/profile');
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-semibold text-ink-900 hover:bg-surface-muted"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="text-ink-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6zM4.5 12a7.5 7.5 0 01.2-1.7l-2-1.5 2-3.4 2.3.9a7.6 7.6 0 011.5-.9l.3-2.4h4l.3 2.4a7.6 7.6 0 011.5.9l2.3-.9 2 3.4-2 1.5c.1.5.2 1.1.2 1.7s-.1 1.2-.2 1.7l2 1.5-2 3.4-2.3-.9a7.6 7.6 0 01-1.5.9l-.3 2.4h-4l-.3-2.4a7.6 7.6 0 01-1.5-.9l-2.3.9-2-3.4 2-1.5A7.5 7.5 0 014.5 12z" />
            </svg>
            Settings
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="flex w-full items-center gap-2.5 border-t border-surface-muted px-3.5 py-2.5 text-left text-[13px] font-semibold text-danger hover:bg-surface-muted"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
