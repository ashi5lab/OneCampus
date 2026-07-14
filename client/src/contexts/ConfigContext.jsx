import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { apiClient } from '../lib/apiClient';
import { resolveVocabulary } from '../lib/vocabulary';

const ConfigContext = createContext(null);

const THEME_CLASS_BY_KEY = {
  slate: 'theme-slate',
  chalkboard: 'theme-chalkboard',
  blueprint: 'theme-blueprint'
};
const THEME_STORAGE_KEY = 'onecampus.theme';

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [themeKey, setThemeKey] = useState(
    () => localStorage.getItem(THEME_STORAGE_KEY) || 'slate'
  );

  useEffect(() => {
    apiClient
      .get('/tenant/config')
      .then((res) => setConfig(res.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const className = THEME_CLASS_BY_KEY[themeKey] || THEME_CLASS_BY_KEY.slate;
    document.documentElement.className = className;
    localStorage.setItem(THEME_STORAGE_KEY, themeKey);
  }, [themeKey]);

  const vocabulary = useMemo(
    () => resolveVocabulary(config?.org_type, config?.vocabulary_override),
    [config]
  );

  const value = {
    config,
    loading,
    error,
    vocabulary,
    t: (key) => vocabulary[key] || key,
    hasModule: (moduleName) => (config?.active_modules || []).includes(moduleName),
    themeKey,
    setThemeKey
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
  return ctx;
}
