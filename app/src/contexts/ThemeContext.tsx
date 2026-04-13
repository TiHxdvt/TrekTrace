/**
 * 主题 Context
 * 管理深色/浅色模式切换，持久化到 AsyncStorage
 * 目前只做状态管理，后续接入实际主题切换时扩展
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';

const SETTINGS_KEY_DARK_MODE = 'darkMode';

interface ThemeContextValue {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDarkMode: true,
  toggleDarkMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  // 启动时从 AsyncStorage 读取偏好
  useEffect(() => {
    (async () => {
      const settings = await storageService.getSettings();
      if (settings && typeof settings[SETTINGS_KEY_DARK_MODE] === 'boolean') {
        setIsDarkMode(settings[SETTINGS_KEY_DARK_MODE]);
      }
    })();
  }, []);

  const toggleDarkMode = useCallback(async () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    const settings = (await storageService.getSettings()) ?? {};
    settings[SETTINGS_KEY_DARK_MODE] = next;
    await storageService.saveSettings(settings);
  }, [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
