import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { OpenedMarkdownFile } from '../src/types/electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('file:openDialog'),
  openFileByPath: (filePath: string) => ipcRenderer.invoke('file:openByPath', filePath),
  watchMarkdownFile: (sourcePath: string) => ipcRenderer.invoke('file:watch', sourcePath),
  unwatchMarkdownFile: (sourcePath: string) => ipcRenderer.invoke('file:unwatch', sourcePath),
  reloadMarkdownFromSource: (sourcePath: string) =>
    ipcRenderer.invoke('file:reloadFromSource', sourcePath),
  onMarkdownFileChanged: (callback: (file: OpenedMarkdownFile) => void) => {
    const handler = (_event: IpcRendererEvent, file: OpenedMarkdownFile) => callback(file);
    ipcRenderer.on('file:contentChanged', handler);
    return () => {
      ipcRenderer.removeListener('file:contentChanged', handler);
    };
  },
  resolveAssetUrl: (baseFilePath: string, relativePath: string) =>
    ipcRenderer.invoke('file:resolveAssetUrl', baseFilePath, relativePath),
  resolveAssetUrls: (baseFilePath: string, hrefs: string[]) =>
    ipcRenderer.invoke('file:resolveAssetUrls', baseFilePath, hrefs),
  getMermaidCacheDataUrl: (projectPath: string, hash: string) =>
    ipcRenderer.invoke('mermaid:getCacheDataUrl', projectPath, hash),
  getMermaidCachePath: (projectPath: string, hash: string) =>
    ipcRenderer.invoke('mermaid:getCachePath', projectPath, hash),
  saveMermaidCache: (projectPath: string, hash: string, pngBase64: string) =>
    ipcRenderer.invoke('mermaid:saveCache', projectPath, hash, pngBase64),
  convertSvgToPng: (svg: string) => ipcRenderer.invoke('mermaid:convertSvgToPng', svg),
  loadProjectSettings: (projectPath: string) => ipcRenderer.invoke('project:loadSettings', projectPath),
  saveProjectSettings: (projectPath: string, settings: unknown) =>
    ipcRenderer.invoke('project:saveSettings', projectPath, settings),
  showExportSaveDialog: (type: 'pdf' | 'docx', defaultFileName: string) =>
    ipcRenderer.invoke('export:showSaveDialog', type, defaultFileName),
  savePdfToPath: (filePath: string) => ipcRenderer.invoke('export:savePdfToPath', filePath),
  saveDocxToPath: (htmlContent: string, filePath: string) =>
    ipcRenderer.invoke('export:saveDocxToPath', htmlContent, filePath),
  isElectron: true,
});
