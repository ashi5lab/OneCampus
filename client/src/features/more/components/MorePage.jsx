import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useAllFeatureLinks } from '../../../hooks/useNavLinks';
import { ModuleBadge } from '../../../components/ModuleBadge';
import { PageHeader } from '../../../components/PageHeader';
import { FlatList, FlatRow } from '../../../components/FlatList';
import { SectionHeader } from '../../../components/SectionHeader';

// Grouping mapping based on the module keys
const CATEGORIES = [
  {
    name: 'People',
    keys: ['learners', 'instructors', 'guardians', 'alumni']
  },
  {
    name: 'Academics',
    keys: ['cohorts', 'class-channels', 'units', 'modules', 'exams', 'timetable', 'kindergarten-activity', 'library']
  },
  {
    name: 'Management',
    keys: ['attendance', 'staff-attendance', 'assignments', 'messages', 'broadcast', 'leave', 'calendar', 'reports', 'discipline', 'ptm', 'visitors']
  },
  {
    name: 'System & Admin',
    keys: ['app-management', 'access-control', 'bulk-upload']
  }
];

export function MorePage() {
  const { can } = useAuth();
  const links = useAllFeatureLinks();
  const [search, setSearch] = useState('');
  const canManagePasswords = can('users.manage_passwords');

  const query = search.trim().toLowerCase();
  const filtered = query
    ? links.filter(
      (link) =>
        link.label.toLowerCase().includes(query) ||
        link.description.toLowerCase().includes(query)
    )
    : links;

  const showSettings = !query || 'settings'.includes(query) || 'account preferences'.includes(query);
  const showAdminTools = canManagePasswords && (!query || 'admin tools password reset force logout'.includes(query));

  // Settings & Custom Admin Link structures to group them easily
  const settingsLink = { key: 'settings', to: '/app/profile', label: 'Settings', description: 'Account preferences' };
  const adminToolsLink = { key: 'admin-tools', to: '/app/admin-tools', label: 'Admin Tools', description: 'Reset credentials' };

  // Prepare grouped features for mobile categorized list view
  const categorizedData = CATEGORIES.map(category => {
    let catLinks = filtered.filter(link => category.keys.includes(link.key));
    if (category.name === 'System & Admin') {
      if (showAdminTools) catLinks.push(adminToolsLink);
      if (showSettings) catLinks.push(settingsLink);
    }
    return { name: category.name, items: catLinks };
  }).filter(cat => cat.items.length > 0);

  return (
    <div className="w-full">
      <PageHeader title="More Apps" />

      <div className="mb-6">
        <input
          className="input w-full"
          placeholder="Search all features…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && !showSettings && (
        <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">
          No matching features.
        </div>
      )}

      {/* Desktop Layout: Premium Responsive Grid Cards */}
      <div className="hidden md:grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((link) => (
          <Link
            key={link.key}
            to={link.to}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 transition hover:border-accent hover:shadow-sm"
          >
            <ModuleBadge moduleKey={link.key} label={link.label} />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-bold text-ink-900 leading-tight truncate">{link.label}</div>
              <div className="truncate text-[12.5px] text-ink-500 mt-0.5">{link.description}</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 text-ink-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        ))}
        {showSettings && (
          <Link
            to="/app/profile"
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 transition hover:border-accent hover:shadow-sm"
          >
            <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl bg-ink-900 text-white font-bold transition-transform duration-200 group-hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6zM4.5 12a7.5 7.5 0 01.2-1.7l-2-1.5 2-3.4 2.3.9a7.6 7.6 0 011.5-.9l.3-2.4h4l.3 2.4a7.6 7.6 0 011.5.9l2.3-.9 2 3.4-2 1.5c.1.5.2 1.1.2 1.7s-.1 1.2-.2 1.7l2 1.5-2 3.4-2.3-.9a7.6 7.6 0 01-1.5.9l-.3 2.4h-4l-.3-2.4a7.6 7.6 0 01-1.5-.9l-2.3.9-2-3.4 2-1.5A7.5 7.5 0 014.5 12z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-bold text-ink-900 leading-tight">Settings</div>
              <div className="truncate text-[12.5px] text-ink-500 mt-0.5">Account & preference settings</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 text-ink-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        )}
        {showAdminTools && (
          <Link
            to="/app/admin-tools"
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 transition hover:border-accent hover:shadow-sm"
          >
            <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold transition-transform duration-200 group-hover:scale-105">
              <span className="text-lg">🛡️</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-bold text-ink-900 leading-tight">Admin Tools</div>
              <div className="truncate text-[12.5px] text-ink-500 mt-0.5">Reset credentials & logouts</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 text-ink-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        )}
      </div>

      {/* Mobile Layout: Categorized Lists */}
      <div className="md:hidden space-y-6 -mx-4">
        {categorizedData.map((category, catIdx) => (
          <div key={catIdx} className="space-y-1">
            <SectionHeader className="px-4">{category.name}</SectionHeader>
            <FlatList className="bg-white">
              {category.items.map((item) => (
                <FlatRow
                  key={item.key}
                  to={item.to}
                  chevron
                >
                  <ModuleBadge moduleKey={item.key} label={item.label} size={36} />
                  <span className="flex-1 min-w-0 text-[14.5px] font-semibold text-ink-900">
                    {item.label}
                  </span>
                </FlatRow>
              ))}
            </FlatList>
          </div>
        ))}
      </div>
    </div>
  );
}



