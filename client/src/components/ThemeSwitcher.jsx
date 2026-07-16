import { useConfig } from '../contexts/ConfigContext';

const THEMES = [
  { key: 'slate', label: 'Slate & Amber' },
  { key: 'chalkboard', label: 'Chalkboard Fresh' },
  { key: 'blueprint', label: 'Blueprint Precision' },
  { key: 'purple', label: 'Purple' },
  { key: 'mono', label: 'Monochrome (Geist Mono)' }
];

// Internal/admin-only theme toggle — proves the token system is decoupled
// from components, per spec Part 15.
export function ThemeSwitcher() {
  const { themeKey, setThemeKey } = useConfig();

  return (
    <select
      value={themeKey}
      onChange={(e) => setThemeKey(e.target.value)}
      className="w-full rounded border border-white/10 bg-transparent px-2 py-1.5 text-xs text-sidebar-text"
    >
      {THEMES.map((theme) => (
        <option key={theme.key} value={theme.key} className="text-ink-900">
          {theme.label}
        </option>
      ))}
    </select>
  );
}
