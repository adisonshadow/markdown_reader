import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReaderSettings } from '../types';
import { defaultSettings, getSettings, mergeSettings, saveSettings } from '../utils/storage';
import { isElectron, loadProjectSettings, saveProjectSettings } from '../utils/electron';

interface SettingsContextValue {
  settings: ReaderSettings;
  updateSettings: (settings: ReaderSettings) => void;
  resetSettings: () => void;
  loaded: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps {
  projectPath?: string;
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ projectPath, children }) => {
  const [settings, setSettings] = useState<ReaderSettings>(() => mergeSettings(getSettings()));
  const [loaded, setLoaded] = useState(!projectPath);

  useEffect(() => {
    if (!projectPath || !isElectron()) {
      setLoaded(true);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const projectSettings = await loadProjectSettings(projectPath!);
        if (!cancelled) {
          setSettings(mergeSettings(projectSettings ?? undefined));
        }
      } catch {
        if (!cancelled) {
          setSettings(mergeSettings(getSettings()));
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  const updateSettings = useCallback(
    (newSettings: ReaderSettings) => {
      const updatedSettings = mergeSettings(newSettings);
      setSettings(updatedSettings);

      if (projectPath && isElectron()) {
        void saveProjectSettings(projectPath, updatedSettings);
      } else {
        saveSettings(updatedSettings);
      }
    },
    [projectPath],
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    if (projectPath && isElectron()) {
      void saveProjectSettings(projectPath, defaultSettings);
    } else {
      saveSettings(defaultSettings);
    }
  }, [projectPath]);

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings, loaded }),
    [settings, updateSettings, resetSettings, loaded],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export function useSettingsContext(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext 必须在 SettingsProvider 内使用');
  }
  return context;
}
