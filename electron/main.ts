import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import path from 'path';
import { markdownFileWatcher } from './fileWatcher';
import { getMermaidCacheDataUrl, getMermaidCachePath, saveMermaidCache } from './mermaidCache';
import {
  ensureMdscapeProject,
  readWorkspaceMarkdown,
  resolveSourcePath,
  syncSourceToWorkspace,
} from './mdscapeProject';
import { loadProjectSettings, saveProjectSettings } from './projectSettings';
import {
  closePrintPreview,
  openPrintPreview,
  printFromPreview,
} from './printPreview';
import { svgStringToPngBase64 } from './svgToPng';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HTMLtoDOCX = require('html-to-docx') as (
  htmlString: string,
  headerHTMLString?: string | null,
  documentOptions?: Record<string, unknown>,
  footerHTMLString?: string | null,
) => Promise<Buffer>;

let mainWindow: BrowserWindow | null = null;

function getPreloadPath(): string {
  return path.join(__dirname, 'preload.js');
}

function getIndexHtmlPath(): string {
  return path.join(__dirname, '../dist/index.html');
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
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

function resolveAbsoluteAssetPath(baseFilePath: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    return path.normalize(relativePath);
  }
  return path.normalize(path.join(path.dirname(baseFilePath), relativePath));
}

async function readAssetAsDataUrl(baseFilePath: string, relativePath: string): Promise<string> {
  if (/^(https?:|data:)/i.test(relativePath)) {
    return relativePath;
  }

  const absolutePath = resolveAbsoluteAssetPath(baseFilePath, relativePath);
  const buffer = await fs.readFile(absolutePath);
  const mimeType = getMimeType(absolutePath);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

async function waitForIndexHtml(maxAttempts = 60, intervalMs = 300): Promise<string> {
  const indexPath = getIndexHtmlPath();

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await fs.access(indexPath, fsConstants.R_OK);
      return indexPath;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(`页面文件未就绪: ${indexPath}`);
}

async function loadWindowContent(win: BrowserWindow) {
  const indexPath = await waitForIndexHtml();
  await win.loadFile(indexPath);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Markdown 预览 + 打印 + 导出',
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

    const shouldRetry =
      !validatedURL ||
      validatedURL.includes('index.html') ||
      validatedURL.startsWith('file://');

    if (shouldRetry && mainWindow && !mainWindow.isDestroyed()) {
      setTimeout(() => {
        void loadWindowContent(mainWindow!).catch((error) => {
          console.error('重试加载页面失败:', error);
        });
      }, 500);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function reloadMarkdownFromSource(sourceFilePath: string, force = false) {
  const sourcePath = await resolveSourcePath(sourceFilePath);
  const { projectPath, workspacePath } = await ensureMdscapeProject(sourcePath);
  await syncSourceToWorkspace(sourcePath, workspacePath, force);
  return readWorkspaceMarkdown(sourcePath, projectPath, workspacePath);
}

async function openMarkdownWithProject(sourceFilePath: string) {
  const sourcePath = await resolveSourcePath(sourceFilePath);
  const { projectPath, workspacePath } = await ensureMdscapeProject(sourcePath);
  await syncSourceToWorkspace(sourcePath, workspacePath);
  return readWorkspaceMarkdown(sourcePath, projectPath, workspacePath);
}

function registerIpcHandlers() {
  ipcMain.handle('file:openDialog', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? mainWindow;
    const result = await dialog.showOpenDialog(win!, {
      title: '打开 Markdown 文件',
      properties: ['openFile'],
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return openMarkdownWithProject(result.filePaths[0]);
  });

  ipcMain.handle('file:openByPath', async (_event, filePath: string) => {
    try {
      return await openMarkdownWithProject(filePath);
    } catch {
      throw new Error('文件不存在或无法读取');
    }
  });

  ipcMain.handle('file:watch', async (event, sourcePath: string) => {
    const resolved = await resolveSourcePath(sourcePath);
    const wc = event.sender;

    markdownFileWatcher.watch(wc, resolved, async () => {
      if (wc.isDestroyed()) {
        return;
      }
      const file = await reloadMarkdownFromSource(resolved);
      wc.send('file:contentChanged', file);
    });
  });

  ipcMain.handle('file:unwatch', async (event, sourcePath: string) => {
    const resolved = await resolveSourcePath(sourcePath);
    markdownFileWatcher.unwatch(event.sender.id, resolved);
  });

  ipcMain.handle('file:reloadFromSource', async (_event, sourcePath: string) => {
    try {
      return await reloadMarkdownFromSource(sourcePath, true);
    } catch {
      throw new Error('无法读取原始文件');
    }
  });

  ipcMain.handle('file:resolveAssetUrl', async (_event, baseFilePath: string, relativePath: string) => {
    try {
      return await readAssetAsDataUrl(baseFilePath, relativePath);
    } catch {
      throw new Error(`资源不存在: ${relativePath}`);
    }
  });

  ipcMain.handle(
    'file:resolveAssetUrls',
    async (_event, baseFilePath: string, hrefs: string[]) => {
      const result: Record<string, string> = {};

      await Promise.all(
        hrefs.map(async (href) => {
          try {
            result[href] = await readAssetAsDataUrl(baseFilePath, href);
          } catch {
            // 单张图片失败不影响其他图片
          }
        }),
      );

      return result;
    },
  );

  ipcMain.handle('mermaid:getCacheDataUrl', async (_event, projectPath: string, hash: string) => {
    return getMermaidCacheDataUrl(projectPath, hash);
  });

  ipcMain.handle('mermaid:getCachePath', async (_event, projectPath: string, hash: string) => {
    return getMermaidCachePath(projectPath, hash);
  });

  ipcMain.handle(
    'mermaid:saveCache',
    async (_event, projectPath: string, hash: string, pngBase64: string) => {
      await saveMermaidCache(projectPath, hash, pngBase64);
      return getMermaidCacheDataUrl(projectPath, hash);
    },
  );

  ipcMain.handle('mermaid:convertSvgToPng', async (_event, svg: string) => {
    console.log('[MermaidCache] 主进程 SVG→PNG 转换, 长度:', svg.length);
    return svgStringToPngBase64(svg);
  });

  ipcMain.handle('project:loadSettings', async (_event, projectPath: string) => {
    return loadProjectSettings(projectPath);
  });

  ipcMain.handle('project:saveSettings', async (_event, projectPath: string, settings: unknown) => {
    await saveProjectSettings(projectPath, settings);
    return { success: true };
  });

  ipcMain.handle(
    'export:showSaveDialog',
    async (event, type: 'pdf' | 'docx', defaultFileName: string) => {
      const win = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
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
      const saveResult = await dialog.showSaveDialog(win, {
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
    },
  );

  ipcMain.handle('export:savePdfToPath', async (event, filePath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
    if (!win) {
      return { success: false, error: '窗口不可用' };
    }

    try {
      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        margins: { marginType: 'default' },
      });
      await fs.writeFile(filePath, pdfBuffer);
      return { success: true, filePath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF 导出失败',
      };
    }
  });

  ipcMain.handle('export:saveDocxToPath', async (_event, htmlContent: string, filePath: string) => {
    const htmlLength = htmlContent.length;
    const embeddedImages = (htmlContent.match(/data:image\/png;base64/g) ?? []).length;
    console.log('[Export] 开始写入 DOCX', { filePath, htmlLength, embeddedImages });

    try {
      const docxBuffer = await HTMLtoDOCX(htmlContent, null, {
        lang: 'zh-CN',
        decodeUnicode: true,
        embedImages: true,
        table: { row: { cantSplit: true } },
        footer: false,
        pageNumber: false,
      });
      await fs.writeFile(filePath, Buffer.from(docxBuffer));
      console.log('[Export] DOCX 写入成功', {
        filePath,
        docxBytes: docxBuffer.length,
        htmlLength,
        embeddedImages,
      });
      return { success: true, filePath };
    } catch (error) {
      console.error('[Export] DOCX 写入失败', {
        filePath,
        htmlLength,
        embeddedImages,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'DOCX 导出失败',
      };
    }
  });

  ipcMain.handle('open-print-preview', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
    if (!win || win.isDestroyed()) {
      return { success: false, error: '窗口不可用' };
    }

    if (win.isMinimized()) {
      win.restore();
    }
    win.focus();

    return openPrintPreview(win.webContents, win);
  });

  ipcMain.handle('print-preview:print', async () => {
    const result = await printFromPreview();
    console.log('[PrintPreview] 打印结果', result);
    return result;
  });

  ipcMain.handle('print-preview:close', async () => {
    await closePrintPreview();
    return { success: true };
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('web-contents-created', (_event, contents) => {
    contents.on('destroyed', () => {
      markdownFileWatcher.unwatchAllForWebContents(contents.id);
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
