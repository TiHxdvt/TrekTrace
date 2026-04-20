/**
 * 主题 Context
 * 管理深色/浅色/跟随系统模式切换，持久化到 AsyncStorage
 * 提供动态 colors 对象供组件使用
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Appearance } from 'react-native';
import { THEMES, ThemeColors } from '../theme';
import { storageService } from '../services/storageService';

const SETTINGS_KEY_THEME_MODE = 'themeMode';
const SETTINGS_KEY_DARK_MODE = 'darkMode'; // 旧 key，用于迁移

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDarkMode: false,
  themeMode: 'light',
  setThemeMode: () => {},
  colors: THEMES.light,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [systemColorScheme, setSystemColorScheme] = useState(Appearance.getColorScheme());

  // 从 themeMode + 系统设置计算 isDarkMode
  const isDarkMode = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  // 启动时从 AsyncStorage 读取偏好（含旧 key 迁移）
  useEffect(() => {
    (async () => {
      const settings = await storageService.getSettings();
      if (!settings) return;

      if (typeof settings[SETTINGS_KEY_THEME_MODE] === 'string') {
        setThemeModeState(settings[SETTINGS_KEY_THEME_MODE] as ThemeMode);
      } else if (typeof settings[SETTINGS_KEY_DARK_MODE] === 'boolean') {
        // 迁移旧设置
        const migrated: ThemeMode = settings[SETTINGS_KEY_DARK_MODE] ? 'dark' : 'light';
        setThemeModeState(migrated);
        settings[SETTINGS_KEY_THEME_MODE] = migrated;
        delete settings[SETTINGS_KEY_DARK_MODE];
        await storageService.saveSettings(settings);
      }
    })();
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });
    return sub.remove;
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    const settings = (await storageService.getSettings()) ?? {};
    settings[SETTINGS_KEY_THEME_MODE] = mode;
    delete settings[SETTINGS_KEY_DARK_MODE];
    await storageService.saveSettings(settings);
  }, []);

  const colors = useMemo(() => isDarkMode ? THEMES.dark : THEMES.light, [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, themeMode, setThemeMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
