"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    openFileDialog: () => electron_1.ipcRenderer.invoke('file:openDialog'),
    openFileByPath: (filePath) => electron_1.ipcRenderer.invoke('file:openByPath', filePath),
    watchMarkdownFile: (sourcePath) => electron_1.ipcRenderer.invoke('file:watch', sourcePath),
    unwatchMarkdownFile: (sourcePath) => electron_1.ipcRenderer.invoke('file:unwatch', sourcePath),
    reloadMarkdownFromSource: (sourcePath) => electron_1.ipcRenderer.invoke('file:reloadFromSource', sourcePath),
    onMarkdownFileChanged: (callback) => {
        const handler = (_event, file) => callback(file);
        electron_1.ipcRenderer.on('file:contentChanged', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('file:contentChanged', handler);
        };
    },
    resolveAssetUrl: (baseFilePath, relativePath) => electron_1.ipcRenderer.invoke('file:resolveAssetUrl', baseFilePath, relativePath),
    resolveAssetUrls: (baseFilePath, hrefs) => electron_1.ipcRenderer.invoke('file:resolveAssetUrls', baseFilePath, hrefs),
    getMermaidCacheDataUrl: (projectPath, hash) => electron_1.ipcRenderer.invoke('mermaid:getCacheDataUrl', projectPath, hash),
    getMermaidCachePath: (projectPath, hash) => electron_1.ipcRenderer.invoke('mermaid:getCachePath', projectPath, hash),
    saveMermaidCache: (projectPath, hash, pngBase64) => electron_1.ipcRenderer.invoke('mermaid:saveCache', projectPath, hash, pngBase64),
    convertSvgToPng: (svg) => electron_1.ipcRenderer.invoke('mermaid:convertSvgToPng', svg),
    loadProjectSettings: (projectPath) => electron_1.ipcRenderer.invoke('project:loadSettings', projectPath),
    saveProjectSettings: (projectPath, settings) => electron_1.ipcRenderer.invoke('project:saveSettings', projectPath, settings),
    showExportSaveDialog: (type, defaultFileName) => electron_1.ipcRenderer.invoke('export:showSaveDialog', type, defaultFileName),
    savePdfToPath: (filePath) => electron_1.ipcRenderer.invoke('export:savePdfToPath', filePath),
    saveDocxToPath: (htmlContent, filePath) => electron_1.ipcRenderer.invoke('export:saveDocxToPath', htmlContent, filePath),
    isElectron: true,
});
