import { Link } from 'react-router-dom';

// Per-card accent palettes, cycled by list position (the approved mock
// alternates a deep green card, then amber, …). Each entry drives the left
// edge bar, the tinted initial badge, and the tinted info chips together
// so a card always reads as one hue.
const PALETTES = [
  { bar: '#1F5C4D', tint: '#E3EDE8', text: '#1F5C4D' },
  { bar: '#B4690E', tint: '#F8E8D6', text: '#95560B' },
  { bar: '#1D4ED8', tint: '#DBEAFE', text: '#1E40AF' },
  { bar: '#7E22CE', tint: '#F3E8FF', text: '#6B21A8' },
  { bar: '#B91C1C', tint: '#FEE2E2', text: '#991B1B' }
];

function Chip({ palette, children }) {
  return (
    <span
      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold"
      style={{ background: palette.tint, color: palette.text }}
    >
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: palette.bar }} />
      {children}
    </span>
  );
}

// One class in a class-picker list (teacher/student "Your Classes" and the
// admin "Class Channels" directory share this) — big rounded card with a
// colored edge bar, tinted initial badge, student count + advisor, and
// tinted chips, per the approved mobile mock.
export function ClassCard({ cohort, to, index = 0 }) {
  const palette = PALETTES[index % PALETTES.length];
  const advisor = cohort.advisor_first_name ? `${cohort.advisor_first_name} ${cohort.advisor_last_name}` : null;

  return (
    <Link
      to={to}
      className="relative flex gap-3.5 overflow-hidden rounded-2xl border border-border bg-surface p-4 pl-5 shadow-sm transition hover:border-accent active:scale-[0.99]"
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: palette.bar }} />

      <div
        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-[22px] font-bold"
        style={{ background: palette.tint, color: palette.text }}
      >
        {(cohort.name || '?')[0].toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="truncate text-[16.5px] font-bold leading-snug text-ink-900">{cohort.name}</div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="mt-1 flex-shrink-0 text-ink-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
          </svg>
        </div>
        <div className="mt-0.5 text-[13px] text-ink-500">{cohort.learner_count} students</div>
        {advisor && <div className="mt-0.5 truncate text-[13.5px] font-medium text-ink-900">{advisor}</div>}

        {cohort.time_block && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip palette={palette}>{cohort.time_block}</Chip>
          </div>
        )}
      </div>
    </Link>
  );
}
