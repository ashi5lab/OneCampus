// The small uppercase label above a list/section (e.g. "Quick actions",
// "Today at a glance") — a component so its type/spacing stays consistent
// wherever a screen introduces a new flat list, instead of each page
// hand-tuning its own label markup.
export function SectionHeader({ children, className = '' }) {
  return (
    <div className={`pb-2 pt-1 text-[11px] font-bold uppercase tracking-wide text-ink-500 ${className}`}>
      {children}
    </div>
  );
}
