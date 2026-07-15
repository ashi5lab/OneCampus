function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ name, src, size = 40 }) {
  const dimension = `${size}px`;

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Profile'}
        className="flex-shrink-0 rounded-full border border-border object-cover"
        style={{ width: dimension, height: dimension }}
      />
    );
  }

  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted font-bold text-ink-700"
      style={{ width: dimension, height: dimension, fontSize: Math.round(size * 0.38) }}
    >
      {initials(name)}
    </div>
  );
}
