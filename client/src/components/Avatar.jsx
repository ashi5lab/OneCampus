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

// Pastel background + text color pairs for initials avatars.
// Deterministically assigned from a name hash so a given person
// always gets the same color across every page.
const AVATAR_PALETTES = [
  { bg: '#F2EDFF', text: '#6B4FBB' },   // Purple
  { bg: '#EAF2FF', text: '#3B6FC0' },   // Blue
  { bg: '#EAFBF2', text: '#1A8D5B' },   // Green
  { bg: '#FFF4E7', text: '#C07B2F' },   // Orange
  { bg: '#FFEAF3', text: '#C0396E' },   // Pink
  { bg: '#FFF8DD', text: '#9E8B1A' },   // Yellow
  { bg: '#E8FAF7', text: '#1A8D7F' },   // Teal
  { bg: '#EEF0FD', text: '#4F46E5' },   // Indigo
];

function nameHash(name) {
  let hash = 0;
  const str = (name || '').toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
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

  const palette = AVATAR_PALETTES[nameHash(name) % AVATAR_PALETTES.length];

  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: dimension,
        height: dimension,
        fontSize: Math.round(size * 0.38),
        backgroundColor: palette.bg,
        color: palette.text,
      }}
    >
      {initials(name)}
    </div>
  );
}

