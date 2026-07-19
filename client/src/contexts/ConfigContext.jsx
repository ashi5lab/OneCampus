import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';
import { resolveVocabulary } from '../lib/vocabulary';

const ConfigContext = createContext(null);

const THEME_CLASS_BY_KEY = {
  slate: 'theme-slate',
  chalkboard: 'theme-chalkboard',
  blueprint: 'theme-blueprint',
  purple: 'theme-purple',
  mono: 'theme-mono'
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
