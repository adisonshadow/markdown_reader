"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const fileWatcher_1 = require("./fileWatcher");
const mermaidCache_1 = require("./mermaidCache");
const mdscapeProject_1 = require("./mdscapeProject");
const projectSettings_1 = require("./projectSettings");
const svgToPng_1 = require("./svgToPng");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HTMLtoDOCX = require('html-to-docx');
let mainWindow = null;
function getPreloadPath() {
    return path_1.default.join(__dirname, 'preload.js');
}
function getIndexHtmlPath() {
    return path_1.default.join(__dirname, '../dist/index.html');
}
function getMimeType(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    const mimeMap = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.bmp': 'image/bmp',
        '.ico': 'image/x-icon',
    };
    return mimeMap[ext] ?? 'application/octet-stream';
}
function resolveAbsoluteAssetPath(baseFilePath, relativePath) {
    if (path_1.default.isAbsolute(relativePath)) {
        return path_1.default.normalize(relativePath);
    }
    return path_1.default.normalize(path_1.default.join(path_1.default.dirname(baseFilePath), relativePath));
}
async function readAssetAsDataUrl(baseFilePath, relativePath) {
    if (/^(https?:|data:)/i.test(relativePath)) {
        return relativePath;
    }
    const absolutePath = resolveAbsoluteAssetPath(baseFilePath, relativePath);
    const buffer = await promises_1.default.readFile(absolutePath);
    const mimeType = getMimeType(absolutePath);
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
async function waitForIndexHtml(maxAttempts = 60, intervalMs = 300) {
    const indexPath = getIndexHtmlPath();
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
            await promises_1.default.access(indexPath, fs_1.constants.R_OK);
            return indexPath;
        }
        catch {
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
    }
    throw new Error(`页面文件未就绪: ${indexPath}`);
}
async function loadWindowContent(win) {
    const indexPath = await waitForIndexHtml();
    await win.loadFile(indexPath);
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 860,
        minWidth: 900,
        minHeight: 600,
        title: 'Markdown 阅读器',
        webPreferences: {
            preload: getPreloadPath(),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });
    void loadWindowContent(mainWindow).catch((error) => {
        console.error('加载页面失败:', error);
    });
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, _description, validatedURL) => {
        if (errorCode === -3) {
            return;
        }
        const shouldRetry = !validatedURL ||
            validatedURL.includes('index.html') ||
            validatedURL.startsWith('file://');
        if (shouldRetry && mainWindow && !mainWindow.isDestroyed()) {
            setTimeout(() => {
                void loadWindowContent(mainWindow).catch((error) => {
                    console.error('重试加载页面失败:', error);
                });
            }, 500);
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
async function reloadMarkdownFromSource(sourceFilePath, force = false) {
    const sourcePath = await (0, mdscapeProject_1.resolveSourcePath)(sourceFilePath);
    const { projectPath, workspacePath } = await (0, mdscapeProject_1.ensureMdscapeProject)(sourcePath);
    await (0, mdscapeProject_1.syncSourceToWorkspace)(sourcePath, workspacePath, force);
    return (0, mdscapeProject_1.readWorkspaceMarkdown)(sourcePath, projectPath, workspacePath);
}
async function openMarkdownWithProject(sourceFilePath) {
    const sourcePath = await (0, mdscapeProject_1.resolveSourcePath)(sourceFilePath);
    const { projectPath, workspacePath } = await (0, mdscapeProject_1.ensureMdscapeProject)(sourcePath);
    await (0, mdscapeProject_1.syncSourceToWorkspace)(sourcePath, workspacePath);
    return (0, mdscapeProject_1.readWorkspaceMarkdown)(sourcePath, projectPath, workspacePath);
}
function registerIpcHandlers() {
    electron_1.ipcMain.handle('file:openDialog', async () => {
        const win = electron_1.BrowserWindow.getFocusedWindow() ?? mainWindow;
        const result = await electron_1.dialog.showOpenDialog(win, {
            title: '打开 Markdown 文件',
            properties: ['openFile'],
            filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
        });
        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }
        return openMarkdownWithProject(result.filePaths[0]);
    });
    electron_1.ipcMain.handle('file:openByPath', async (_event, filePath) => {
        try {
            return await openMarkdownWithProject(filePath);
        }
        catch {
            throw new Error('文件不存在或无法读取');
        }
    });
    electron_1.ipcMain.handle('file:watch', async (event, sourcePath) => {
        const resolved = await (0, mdscapeProject_1.resolveSourcePath)(sourcePath);
        const wc = event.sender;
        fileWatcher_1.markdownFileWatcher.watch(wc, resolved, async () => {
            if (wc.isDestroyed()) {
                return;
            }
            const file = await reloadMarkdownFromSource(resolved);
            wc.send('file:contentChanged', file);
        });
    });
    electron_1.ipcMain.handle('file:unwatch', async (event, sourcePath) => {
        const resolved = await (0, mdscapeProject_1.resolveSourcePath)(sourcePath);
        fileWatcher_1.markdownFileWatcher.unwatch(event.sender.id, resolved);
    });
    electron_1.ipcMain.handle('file:reloadFromSource', async (_event, sourcePath) => {
        try {
            return await reloadMarkdownFromSource(sourcePath, true);
        }
        catch {
            throw new Error('无法读取原始文件');
        }
    });
    electron_1.ipcMain.handle('file:resolveAssetUrl', async (_event, baseFilePath, relativePath) => {
        try {
            return await readAssetAsDataUrl(baseFilePath, relativePath);
        }
        catch {
            throw new Error(`资源不存在: ${relativePath}`);
        }
    });
    electron_1.ipcMain.handle('file:resolveAssetUrls', async (_event, baseFilePath, hrefs) => {
        const result = {};
        await Promise.all(hrefs.map(async (href) => {
            try {
                result[href] = await readAssetAsDataUrl(baseFilePath, href);
            }
            catch {
                // 单张图片失败不影响其他图片
            }
        }));
        return result;
    });
    electron_1.ipcMain.handle('mermaid:getCacheDataUrl', async (_event, projectPath, hash) => {
        return (0, mermaidCache_1.getMermaidCacheDataUrl)(projectPath, hash);
    });
    electron_1.ipcMain.handle('mermaid:getCachePath', async (_event, projectPath, hash) => {
        return (0, mermaidCache_1.getMermaidCachePath)(projectPath, hash);
    });
    electron_1.ipcMain.handle('mermaid:saveCache', async (_event, projectPath, hash, pngBase64) => {
        await (0, mermaidCache_1.saveMermaidCache)(projectPath, hash, pngBase64);
        return (0, mermaidCache_1.getMermaidCacheDataUrl)(projectPath, hash);
    });
    electron_1.ipcMain.handle('mermaid:convertSvgToPng', async (_event, svg) => {
        console.log('[MermaidCache] 主进程 SVG→PNG 转换, 长度:', svg.length);
        return (0, svgToPng_1.svgStringToPngBase64)(svg);
    });
    electron_1.ipcMain.handle('project:loadSettings', async (_event, projectPath) => {
        return (0, projectSettings_1.loadProjectSettings)(projectPath);
    });
    electron_1.ipcMain.handle('project:saveSettings', async (_event, projectPath, settings) => {
        await (0, projectSettings_1.saveProjectSettings)(projectPath, settings);
        return { success: true };
    });
    electron_1.ipcMain.handle('export:showSaveDialog', async (event, type, defaultFileName) => {
        const win = electron_1.BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
        if (!win || win.isDestroyed()) {
            console.error('[Export] 保存对话框：窗口不可用');
            return { canceled: true };
        }
        if (win.isMinimized()) {
            win.restore();
        }
        win.focus();
        const isPdf = type === 'pdf';
        console.log('[Export] 打开保存对话框:', type, defaultFileName);
        const saveResult = await electron_1.dialog.showSaveDialog(win, {
            title: isPdf ? '导出 PDF' : '导出 DOCX',
            defaultPath: defaultFileName,
            filters: isPdf
                ? [{ name: 'PDF', extensions: ['pdf'] }]
                : [{ name: 'Word 文档', extensions: ['docx'] }],
        });
        if (saveResult.canceled || !saveResult.filePath) {
            console.log('[Export] 保存对话框已取消');
            return { canceled: true };
        }
        console.log('[Export] 保存路径:', saveResult.filePath);
        return { canceled: false, filePath: saveResult.filePath };
    });
    electron_1.ipcMain.handle('export:savePdfToPath', async (event, filePath) => {
        const win = electron_1.BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
        if (!win) {
            return { success: false, error: '窗口不可用' };
        }
        try {
            const pdfBuffer = await win.webContents.printToPDF({
                printBackground: true,
                margins: { marginType: 'default' },
            });
            await promises_1.default.writeFile(filePath, pdfBuffer);
            return { success: true, filePath };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'PDF 导出失败',
            };
        }
    });
    electron_1.ipcMain.handle('export:saveDocxToPath', async (_event, htmlContent, filePath) => {
        try {
            const docxBuffer = await HTMLtoDOCX(htmlContent, null, {
                table: { row: { cantSplit: true } },
                footer: false,
                pageNumber: false,
            });
            await promises_1.default.writeFile(filePath, Buffer.from(docxBuffer));
            return { success: true, filePath };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'DOCX 导出失败',
            };
        }
    });
}
electron_1.app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();
    electron_1.app.on('web-contents-created', (_event, contents) => {
        contents.on('destroyed', () => {
            fileWatcher_1.markdownFileWatcher.unwatchAllForWebContents(contents.id);
        });
    });
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
