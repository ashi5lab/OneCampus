// Fixed, theme-independent categorical palette (not the theme's own accent
// tokens — those are a single hue per theme, not five distinct ones) —
// validated with the dataviz skill's CVD/contrast checker. Each role also
// gets a distinct letter, not just a color, so identity is never
// color-alone even in the one pair that lands in the CVD warn band
// (amber/staff vs green/learner).
const ROLE_BADGE = {
  admin: { letter: 'A', color: '#6366F1' },
  instructor: { letter: 'T', color: '#2563EB' },
  learner: { letter: 'L', color: '#16A34A' },
  staff: { letter: 'S', color: '#D97706' },
  guardian: { letter: 'G', color: '#DB2777' }
};

export function RoleBadge({ role, size = 18 }) {
  const badge = ROLE_BADGE[role];
  if (!badge) return null;

  return (
    <span
      title={role[0].toUpperCase() + role.slice(1)}
      className="inline-flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ backgroundColor: badge.color, width: size, height: size, fontSize: size * 0.58 }}
    >
      {badge.letter}
    </span>
  );
}
