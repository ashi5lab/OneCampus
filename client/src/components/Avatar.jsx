import { useState } from 'react';

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
  // Falls back to the initials circle if the photo URL 404s/goes stale
  // (deleted from Cloudinary, etc.) — without this an <img> with a broken
  // src renders a broken-image icon with overflowing alt text instead.
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name || 'Profile'}
        onError={() => setBroken(true)}
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
