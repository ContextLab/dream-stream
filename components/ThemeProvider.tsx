import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { storage } from '@/lib/storage';
import { lightTheme, darkTheme, type Theme } from '@/theme/tokens';

const STORAGE_KEY = 'user_theme_preference';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const deviceColorScheme = useDeviceColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadPreference() {
      const saved = await storage.get<ThemeMode>(STORAGE_KEY);
      if (saved) {
        setModeState(saved);
      }
      setIsLoaded(true);
    }
    loadPreference();
  }, []);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    await storage.set(STORAGE_KEY, newMode);
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : mode === 'light' ? 'dark' : 'dark');
  }, [mode, setMode]);

  const resolvedIsDark = useMemo(() => {
    if (mode === 'system') {
      return deviceColorScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, deviceColorScheme]);

  const theme = useMemo(() => {
    return resolvedIsDark ? darkTheme : lightTheme;
  }, [resolvedIsDark]);

  const value = useMemo(
    () => ({
      theme,
      mode,
      isDark: resolvedIsDark,
      setMode,
      toggleTheme,
    }),
    [theme, mode, resolvedIsDark, setMode, toggleTheme]
  );

  if (!isLoaded) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useThemeColors() {
  const { theme } = useTheme();
  return theme;
}
