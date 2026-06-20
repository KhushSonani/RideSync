import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ColorSchemeType = 'light' | 'dark' | 'system';

interface ThemeTokens {
  colors: {
    background: string;
    surface: string;
    card: string;
    border: string;
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
  };
  spacing: typeof spacingTokens;
  radius: typeof radiusTokens;
  typography: typeof typographyTokens;
  shadows: typeof shadowTokens;
}

const spacingTokens = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
};
const radiusTokens = {
  sm: 4, md: 8, lg: 16, xl: 24, pill: 9999,
};
const typographyTokens = {
  caption: 12, body: 14, subtitle: 16, title: 20, heading: 24,
};
const shadowTokens = {
  light: '0 1px 3px rgba(0,0,0,0.1)',
  medium: '0 4px 6px rgba(0,0,0,0.1)',
  heavy: '0 10px 15px rgba(0,0,0,0.1)',
};

const lightColors = {
  background: '#F3F4F6',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E5E7EB',
  primary: '#0D9488',
  secondary: '#0F766E',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
};

const darkColors = {
  background: '#070B12',
  surface: '#111827',
  card: '#0D1420',
  border: '#374151',
  primary: '#11E0C5',
  secondary: '#0D9488',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  textPrimary: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
};

interface ThemeContextType {
  isDarkMode: boolean;
  colorScheme: 'light' | 'dark';
  themePreference: ColorSchemeType;
  setThemePreference: (scheme: ColorSchemeType) => void;
  theme: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_PREFERENCE_KEY = '@theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { setColorScheme: setNwColorScheme } = useNativeWindColorScheme();

  const [themePreference, setThemePrefState] = useState<ColorSchemeType>('system');
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(() => {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemePrefState(savedTheme as ColorSchemeType);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => subscription.remove();
  }, []);

  const activeScheme = themePreference === 'system' ? systemScheme : themePreference;
  const isDarkMode = activeScheme === 'dark';

  useEffect(() => {
    setNwColorScheme(activeScheme);
  }, [activeScheme, setNwColorScheme]);

  const setThemePreference = async (scheme: ColorSchemeType) => {
    setThemePrefState(scheme);
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, scheme);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const theme: ThemeTokens = {
    colors: isDarkMode ? darkColors : lightColors,
    spacing: spacingTokens,
    radius: radiusTokens,
    typography: typographyTokens,
    shadows: shadowTokens,
  };

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, 
      colorScheme: activeScheme, 
      themePreference, 
      setThemePreference, 
      theme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
