// The shared "premium card" surface (per Rules.md §3 — bg-surface, rounded-2xl,
// shadow-sm, border-border) as a component instead of a copy-pasted class
// string. Restyling every card in the app later (radius, shadow weight,
// border) becomes a one-file edit here instead of hunting through every
// page that hand-rolled the recipe.
//
// Deliberately thin — it owns only the surface (background/radius/border/
// shadow/padding), never layout or content. Pass `onClick` to get tap
// affordance (hover shadow + press scale); omit it for a static card.
export function Card({ children, padding = 'p-4', onClick, className = '' }) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface md:rounded-2xl border-0 md:border border-border md:shadow-sm ${padding} ${
        onClick ? 'cursor-pointer transition-shadow hover:shadow-md active:scale-[0.99]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
