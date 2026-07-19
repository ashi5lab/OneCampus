import { colorForModule } from '../lib/moduleColors';

// Small colored square icon used to represent a module/feature — on the
// Dashboard's "Your Modules" grid and the More directory. Shows the first
// letter of the (possibly vocabulary-overridden) label rather than a fixed
// icon set, so it never falls out of sync with a tenant's custom naming.
export function ModuleBadge({ moduleKey, label, size = 38 }) {
  const { bg, fg } = colorForModule(moduleKey);
  const dimension = `${size}px`;
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded font-bold"
      style={{ width: dimension, height: dimension, backgroundColor: bg, color: fg, fontSize: Math.round(size * 0.45) }}
    >
      {(label || '?')[0]?.toUpperCase()}
    </div>
  );
}
