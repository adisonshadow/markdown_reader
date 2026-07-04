import type { MarkdownFile, ReaderSettings, HistoryRecord } from '../types';
import { FONT_FAMILY_PRESETS } from './themes';

const STORAGE_KEYS = {
  SETTINGS: 'md_reader_settings',
  HISTORY: 'md_reader_history',
};

const defaultFontFamily = FONT_FAMILY_PRESETS[7].value;

export const defaultSettings: ReaderSettings = {
  mode: 'theme',
  themeId: 'official-doc',
  compactLineHeight: false,
  fontSize: {
    h1: 32,
    h2: 28,
    h3: 24,
    h4: 20,
    h5: 18,
    h6: 16,
    paragraph: 16,
    code: 14,
  },
  fontFamily: {
    h1: defaultFontFamily,
    h2: defaultFontFamily,
    h3: defaultFontFamily,
    h4: defaultFontFamily,
    h5: defaultFontFamily,
    h6: defaultFontFamily,
    paragraph: defaultFontFamily,
  },
  colors: {
    text: '#333333',
    background: '#ffffff',
    link: '#1890ff',
    code: '#f5f5f5',
  },
  fontWeight: {
    h1: 600,
    h2: 600,
    h3: 600,
    h4: 400,
    h5: 400,
    h6: 400,
    paragraph: 400,
  },
  lineHeight: 1.6,
};

export function mergeSettings(raw: Partial<ReaderSettings> | null | undefined): ReaderSettings {
  if (!raw) {
    return defaultSettings;
  }

  return {
    ...defaultSettings,
    ...raw,
    fontSize: { ...defaultSettings.fontSize, ...raw.fontSize },
    fontFamily: { ...defaultSettings.fontFamily, ...raw.fontFamily },
    colors: { ...defaultSettings.colors, ...raw.colors },
    fontWeight: { ...defaultSettings.fontWeight, ...raw.fontWeight },
  };
}

export const saveSettings = (settings: ReaderSettings): void => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

export const getSettings = (): ReaderSettings => {
  const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return mergeSettings(settings ? JSON.parse(settings) : undefined);
};

export const addToHistory = (file: MarkdownFile): void => {
  const history = getHistory();
  const historyPath = file.sourcePath ?? file.path;
  const record: HistoryRecord = {
    path: historyPath,
    name: file.name,
    lastOpened: Date.now(),
  };

  const filtered = history.filter((item) => item.path !== historyPath);
  filtered.unshift(record);

  const recentHistory = filtered.slice(0, 20);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(recentHistory));
};

export const getHistory = (): HistoryRecord[] => {
  const history = localStorage.getItem(STORAGE_KEYS.HISTORY);
  if (!history) {
    return [];
  }

  try {
    const parsed = JSON.parse(history) as Array<Partial<HistoryRecord>>;
    return parsed
      .filter((item): item is HistoryRecord => Boolean(item.path && item.name))
      .map((item) => ({
        path: item.path!,
        name: item.name!,
        lastOpened: item.lastOpened ?? 0,
      }));
  } catch {
    return [];
  }
};

export const removeFromHistory = (filePath: string): void => {
  const history = getHistory().filter((item) => item.path !== filePath);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
};
