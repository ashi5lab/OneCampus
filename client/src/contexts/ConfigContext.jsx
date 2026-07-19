import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';
import { resolveVocabulary } from '../lib/vocabulary';

const ConfigContext = createContext(null);

// Single theme for now (see theme.css) — the key/class-switching mechanism
// stays in place so adding another theme later is a matter of defining a
// new `.theme-x` block and adding it here, not touching this file's logic.
const THEME_CLASS_BY_KEY = {
  slate: 'theme-slate'
};
const THEME_STORAGE_KEY = 'onecampus.theme';

// Most of this app's text sizes are hardcoded px (text-[13.5px] etc.), not
// Tailwind's rem-based scale — so a CSS variable multiplier wouldn't reach
// them without rewriting every component. `zoom` scales the whole rendered
// page (fonts, spacing, icons) uniformly regardless of the underlying
// units, and — unlike `transform: scale`, the other candidate — doesn't
// create a new containing block for `position: fixed` descendants, so
// every full-viewport modal (`fixed inset-0`) in this app keeps covering
// the actual viewport instead of just the pre-zoom page area.
const FONT_SCALE_STORAGE_KEY = 'onecampus.fontScale';
const DEFAULT_FONT_SCALE = 100;

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [themeKey, setThemeKey] = useState(
    () => localStorage.getItem(THEME_STORAGE_KEY) || 'slate'
  );
  const [fontScale, setFontScale] = useState(
    () => Number(localStorage.getItem(FONT_SCALE_STORAGE_KEY)) || DEFAULT_FONT_SCALE
  );

  // Exposed as reloadConfig so the tenant login page can re-fetch once the
  // user's chosen tenant domain is actually known to be valid (right after
  // a successful login) — the mount-time fetch below only knows whatever
  // domain was resolved before the user typed/confirmed one (env default,
  // or a domain persisted from a previous session).
  const loadConfig = useCallback(() => {
    setLoading(true);
    return apiClient
      .get('/tenant/config')
      .then((res) => setConfig(res.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    const className = THEME_CLASS_BY_KEY[themeKey] || THEME_CLASS_BY_KEY.slate;
    document.documentElement.className = className;
    localStorage.setItem(THEME_STORAGE_KEY, themeKey);

    // The mobile header/nav drawer paint full-bleed under the status bar in
    // --sidebar-bg (see Layout.jsx/Sidebar.jsx), and index.html's
    // black-translucent status bar is a transparent overlay whose own icons
    // (time/battery/signal) always render white with no way to request dark
    // ones — so theme-color needs to track --sidebar-bg per theme, and
    // themes whose --sidebar-bg is too light for white icons (theme-purple)
    // need to fall back to an opaque 'default' bar with dark icons instead.
    // --sidebar-bg is declared as a plain #RRGGBB literal in every theme in
    // theme.css (never a var()/oklch() chain), so getPropertyValue returns
    // it as-is with no resolution needed.
    const sidebarBg = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-bg').trim();
    const hexMatch = /^#([0-9a-f]{6})$/i.exec(sidebarBg);
    if (hexMatch) {
      const r = parseInt(hexMatch[1].slice(0, 2), 16);
      const g = parseInt(hexMatch[1].slice(2, 4), 16);
      const b = parseInt(hexMatch[1].slice(4, 6), 16);
      const isLight = 0.299 * r + 0.587 * g + 0.114 * b > 170;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', sidebarBg);
      document
        .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
        ?.setAttribute('content', isLight ? 'default' : 'black-translucent');
    }
  }, [themeKey]);

  // Applied as an inline style (not a className) so it can't collide with
  // the theme effect above, which replaces documentElement.className
  // wholesale.
  useEffect(() => {
    document.documentElement.style.zoom = `${fontScale}%`;
    localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(fontScale));
  }, [fontScale]);

  const vocabulary = useMemo(
    () => resolveVocabulary(config?.org_type, config?.vocabulary_override),
    [config]
  );

  const value = {
    config,
    loading,
    error,
    reloadConfig: loadConfig,
    vocabulary,
    t: (key) => vocabulary[key] || key,
    hasModule: (moduleName) => (config?.active_modules || []).includes(moduleName),
    themeKey,
    setThemeKey,
    fontScale,
    setFontScale,
    defaultFontScale: DEFAULT_FONT_SCALE
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
  return ctx;
}
