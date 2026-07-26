import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// Edge-to-edge list, iOS Contacts/Settings style — rows sit flush against
// each other with a hairline divider between them (never after the last
// one, via `divide-y`), instead of each row being its own rounded/bordered/
// shadowed card with a gap to the next. No outer rounding either: this
// component owns none of the surrounding page's surface, it's just the
// rows. Wrap it in a <Card> (or nothing, for a fully edge-to-edge section)
// depending on whether the list needs its own visible container.
export function FlatList({ children, className = '' }) {
  return <div className={`divide-y divide-border-subtle ${className}`}>{children}</div>;
}

// A single row inside a FlatList.
// - Pass `to` for a Link, `onClick` for a button, or neither for a static row.
// - `icon` + `iconBg`/`iconColor` render a small rounded icon chip on the left.
// - `title`/`subtitle`/`trailing`/`chevron` cover the common "identity + one
//   line of meta + trailing value or arrow" row shape. For anything more
//   custom (multiple meta lines, inline badges, a form control), pass
//   `children` instead and lay it out yourself — FlatRow still supplies the
//   tap target, padding, and divider.
export function FlatRow({
  icon: Icon,
  iconBg = 'var(--accent-light)',
  iconColor = 'var(--accent)',
  title,
  subtitle,
  trailing,
  chevron = false,
  to,
  onClick,
  disabled = false,
  children,
  className = ''
}) {
  const interactive = Boolean((to || onClick) && !disabled);
  const Component = to && !disabled ? Link : onClick ? 'button' : 'div';
  const extraProps = to && !disabled ? { to } : onClick ? { onClick, type: 'button', disabled } : {};

  return (
    <Component
      {...extraProps}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
        interactive ? 'active:bg-surface-muted transition-colors' : ''
      } ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {children ?? (
        <>
          {Icon && (
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ background: iconBg, color: iconColor }}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14.5px] font-semibold text-ink-900">{title}</div>
            {subtitle && <div className="mt-0.5 truncate text-[12.5px] text-ink-500">{subtitle}</div>}
          </div>
          {trailing}
          {chevron && <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-300" />}
        </>
      )}
    </Component>
  );
}
