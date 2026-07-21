import { useLocation, useNavigate } from 'react-router-dom';

// The bottom tab bar's own fixed destinations (see BottomTabBar.jsx/
// Sidebar.jsx) — there's nothing shallower to pop back to from any of
// these, so they never get a back button.
const ROOT_PATHS = ['/app', '/app/learners', '/app/cohorts', '/app/class', '/app/activities', '/app/more', '/app/profile'];

// Exported (not just used internally) for the handful of pages whose header
// isn't the standard eyebrow/title shape — an avatar-centric profile card,
// say — but that still need exactly this same back button, in exactly this
// same place, rather than inventing their own. Pair with useAutoBack() for
// the same "which routes get one" logic PageHeader itself uses.
export function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="-ml-1.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-surface-muted hover:text-ink-900"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

// Same "is this a bottom-tab-bar destination" check PageHeader uses
// internally, for pages that render <BackButton /> directly instead of
// going through <PageHeader>.
export function useAutoBack(back) {
  const location = useLocation();
  const navigate = useNavigate();
  const showBack = back ?? !ROOT_PATHS.includes(location.pathname);
  return { showBack, goBack: () => navigate(-1) };
}

// Mobile-only "tap for details" stand-in for the subtitle line, which is
// hidden below sm: — same trade-off the Class page makes (advisor name +
// student count doesn't fit next to a title on a phone, but shouldn't
// disappear entirely).
function InfoTooltip({ text }) {
  if (!text) return null;
  return (
    <div className="flex flex-shrink-0 items-center text-ink-400 sm:hidden" title={text}>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );
}

// The one page-header shape used everywhere, modeled on the Class page:
// eyebrow/title/subtitle on the left (subtitle collapses to a tap-for-info
// icon on mobile), optional right-aligned actions, an optional tabs row
// underneath. The back icon is automatic — every route that isn't one of
// the bottom tab bar's own fixed destinations gets exactly one, inline to
// the left of the title, so no page needs (or should have) its own
// hand-rolled "Back to X" link alongside it.
//
// `back`/`onBack` are only there for the handful of pages whose back
// destination isn't "the previous route" — e.g. ClassChannel, where a
// single-class user's /app/class *is* their channel (no back needed) but a
// multi-class user's is one level under the class picker (back needed),
// with no URL difference between the two; or a page with an in-place
// sub-view (local state, not a route) that wants "back" to collapse that
// sub-view instead of leaving the page. Everywhere else, omit both and it
// does the right thing automatically.
export function PageHeader({ eyebrow, title, subtitle, actions, tabs, back, onBack, className = '' }) {
  const { showBack, goBack } = useAutoBack(back);
  const subtitleText = typeof subtitle === 'string' ? subtitle : undefined;

  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:items-baseline sm:gap-3">
          {showBack && <BackButton onClick={onBack || goBack} />}
          <div>
            <h1 className="flex items-center gap-1.5 font-display text-2xl font-bold tracking-tight text-ink-900">
              {title}
              <InfoTooltip text={subtitleText} />
            </h1>
          </div>
          {subtitle && <div className="hidden text-[13px] text-ink-500 sm:block sm:pb-1">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {tabs && <div className="mt-4">{tabs}</div>}
    </div>
  );
}
