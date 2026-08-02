// Shared color system for the Insights "report center" (InsightsPage.jsx
// and its per-tab components) — one place so every tab agrees on which
// hue means which pillar instead of each file inventing its own.
//
// Fixed section→hue assignment (never re-cycled per render) using the
// validate_palette.js-checked categorical set in theme.css
// (--chart-blue/orange/aqua/yellow/magenta/violet). Discipline stays on
// the real status tokens (--success/--warning/--danger) instead of a
// categorical hue since severity genuinely IS a status, not an identity.
export const PILLAR = {
  attendance: 'var(--chart-blue)',
  academics: 'var(--chart-violet)',
  exams: 'var(--chart-orange)',
  library: 'var(--chart-aqua)',
  certificates: 'var(--chart-yellow)',
  community: 'var(--chart-magenta)'
};

export const STATUS_COLOR = { present: 'var(--success)', absent: 'var(--danger)', late: 'var(--warning)', excused: 'var(--ink-300)' };
export const STATUS_LABEL = { present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused' };
export const SEVERITY_COLOR = { positive: 'var(--success)', minor: 'var(--warning)', major: 'var(--danger)' };
export const SEVERITY_LABEL = { positive: 'Positive Notes', minor: 'Minor', major: 'Major' };

// Tint a hue against the current surface for a soft card/chip background —
// color-mix() keeps this reactive to the active theme (light/dark, and any
// data-theme override) without duplicating hex values in JS.
export function tint(colorVar, pct) {
  return `color-mix(in srgb, ${colorVar} ${pct}%, var(--surface))`;
}
