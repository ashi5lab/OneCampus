import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAllFeatureLinks } from '../../../hooks/useNavLinks';
import { ModuleBadge } from '../../../components/ModuleBadge';
import { PageHeader } from '../../../components/PageHeader';

// Full feature directory — every module this user can access, regardless
// of whether it's pinned to the Dashboard's "Your Modules" grid (see
// useNavLinks.js's useAllFeatureLinks vs useNavLinks). Reached via the
// "More" item in the sidebar/bottom-tab nav.
export function MorePage() {
  const links = useAllFeatureLinks();
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? links.filter(
        (link) =>
          link.label.toLowerCase().includes(search.trim().toLowerCase()) ||
          link.description.toLowerCase().includes(search.trim().toLowerCase())
      )
    : links;

  return (
    <div>
      <PageHeader title="More" />

      <div className="mb-5">
        <input
          className="input w-full"
          placeholder="Search all features…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && (
        <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">
          No matching features.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {filtered.map((link) => (
            <Link
              key={link.key}
              to={link.to}
              className="flex items-center gap-3 rounded border border-border bg-surface p-3.5 transition hover:border-accent"
            >
              <ModuleBadge moduleKey={link.key} label={link.label} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-ink-900">{link.label}</div>
                <div className="truncate text-[12px] text-ink-500">{link.description}</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 text-ink-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
