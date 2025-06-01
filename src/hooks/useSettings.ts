import { useState, useCallback, useEffect } from 'react';
import type { ReaderSettings } from '../types';
import { getSettings, saveSettings, defaultSettings } from '../utils/storage';

export const useSettings = () => {
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const savedSettings = getSettings();
    // 确保所有必需的字段都存在
    return {
      ...defaultSettings,
      ...savedSettings,
      fontSize: { ...defaultSettings.fontSize, ...savedSettings.fontSize },
      colors: { ...defaultSettings.colors, ...savedSettings.colors },
      fontWeight: { ...defaultSettings.fontWeight, ...savedSettings.fontWeight },
    };
  });

  // 监听 localStorage 变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'md_reader_settings') {
        const newSettings = e.newValue ? JSON.parse(e.newValue) : defaultSettings;
        setSettings({
          ...defaultSettings,
          ...newSettings,
          fontSize: { ...defaultSettings.fontSize, ...newSettings.fontSize },
          colors: { ...defaultSettings.colors, ...newSettings.colors },
          fontWeight: { ...defaultSettings.fontWeight, ...newSettings.fontWeight },
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 确保设置始终存在
  useEffect(() => {
    if (!localStorage.getItem('md_reader_settings')) {
      saveSettings(defaultSettings);
    }
  }, []);

  const updateSettings = useCallback((newSettings: ReaderSettings) => {
    const updatedSettings = {
      ...defaultSettings,
      ...newSettings,
      fontSize: { ...defaultSettings.fontSize, ...newSettings.fontSize },
      colors: { ...defaultSettings.colors, ...newSettings.colors },
      fontWeight: { ...defaultSettings.fontWeight, ...newSettings.fontWeight },
    };
    // 先更新状态，再保存到 localStorage
    setSettings(updatedSettings);
    // 使用自定义事件来通知设置更新
    const event = new CustomEvent('settingsUpdated', { detail: updatedSettings });
    window.dispatchEvent(event);
    saveSettings(updatedSettings);
  }, []);

  // 监听自定义事件
  useEffect(() => {
    const handleSettingsUpdate = (e: CustomEvent<ReaderSettings>) => {
      setSettings(e.detail);
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    saveSettings(defaultSettings);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}; 