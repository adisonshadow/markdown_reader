import type { MarkdownFile, ReaderSettings, HistoryRecord } from '../types';

const STORAGE_KEYS = {
  FILES: 'md_reader_files',
  SETTINGS: 'md_reader_settings',
  HISTORY: 'md_reader_history',
};

// 默认设置
export const defaultSettings: ReaderSettings = {
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

// 文件存储相关
export const saveFile = (file: MarkdownFile): void => {
  const files = getFiles();
  const index = files.findIndex(f => f.id === file.id);
  
  if (index !== -1) {
    files[index] = file;
  } else {
    files.push(file);
  }
  
  const filesJson = JSON.stringify(files);
  console.log('Saving files:', filesJson);
  localStorage.setItem(STORAGE_KEYS.FILES, filesJson);
  
  window.dispatchEvent(new CustomEvent('filesUpdated', { detail: files }));
};

export const getFiles = (): MarkdownFile[] => {
  const filesJson = localStorage.getItem(STORAGE_KEYS.FILES);
  const files = filesJson ? JSON.parse(filesJson) : [];
  console.log('Getting files:', files);
  return files;
};

export const deleteFile = (id: string): void => {
  const files = getFiles().filter(f => f.id !== id);
  localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
};

// 设置相关
export const saveSettings = (settings: ReaderSettings): void => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

export const getSettings = (): ReaderSettings => {
  const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return settings ? JSON.parse(settings) : defaultSettings;
};

// 历史记录相关
export const addToHistory = (file: MarkdownFile): void => {
  const history = getHistory();
  const record: HistoryRecord = {
    id: file.id,
    name: file.name,
    lastOpened: Date.now(),
    path: file.path,
  };

  const index = history.findIndex(h => h.id === file.id);
  if (index !== -1) {
    history[index] = record;
  } else {
    history.unshift(record);
  }

  // 只保留最近20条记录
  const recentHistory = history.slice(0, 20);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(recentHistory));
};

export const getHistory = (): HistoryRecord[] => {
  const history = localStorage.getItem(STORAGE_KEYS.HISTORY);
  return history ? JSON.parse(history) : [];
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
}; 