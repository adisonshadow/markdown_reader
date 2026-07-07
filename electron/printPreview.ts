import { app, BrowserWindow, type WebContents } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

interface PreviewSession {
  window: BrowserWindow;
  tempDir: string;
  pdfPath: string;
}

let activePreview: PreviewSession | null = null;

function getShellHtmlPath(): string {
  return path.join(__dirname, 'printPreviewShell.html');
}

function getShellPreloadPath(): string {
  return path.join(__dirname, 'printPreviewPreload.js');
}

async function cleanupSession(session: PreviewSession | null): Promise<void> {
  if (!session) {
    return;
  }

  if (!session.window.isDestroyed()) {
    session.window.destroy();
  }

  try {
    await fs.rm(session.tempDir, { recursive: true, force: true });
  } catch (error) {
    console.warn('[PrintPreview] 清理临时目录失败:', error);
  }
}

export async function closePrintPreview(): Promise<void> {
  const session = activePreview;
  activePreview = null;
  await cleanupSession(session);
}

export async function printFromPreview(): Promise<{ success: boolean; canceled?: boolean; error?: string }> {
  const session = activePreview;
  if (!session || session.window.isDestroyed()) {
    return { success: false, error: '打印预览窗口不可用' };
  }

  const pdfWin = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await pdfWin.loadFile(session.pdfPath);
    await new Promise<void>((resolve) => {
      pdfWin.webContents.once('did-finish-load', () => resolve());
    });

    return await new Promise((resolve) => {
      pdfWin.webContents.print({}, (success, failureReason) => {
        if (success) {
          resolve({ success: true });
          return;
        }

        const canceled = !failureReason || /cancel/i.test(failureReason);
        resolve({
          success: false,
          canceled,
          error: canceled ? undefined : failureReason || '打印失败',
        });
      });
    });
  } finally {
    if (!pdfWin.isDestroyed()) {
      pdfWin.destroy();
    }
  }
}

export async function openPrintPreview(
  sourceWebContents: WebContents,
  parentWindow: BrowserWindow | null,
): Promise<{ success: boolean; error?: string }> {
  const parent = parentWindow && !parentWindow.isDestroyed() ? parentWindow : null;

  if (activePreview && !activePreview.window.isDestroyed()) {
    activePreview.window.focus();
    return { success: true };
  }

  await closePrintPreview();

  console.log('[PrintPreview] 生成 PDF 用于预览…');

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = Buffer.from(
      await sourceWebContents.printToPDF({
        printBackground: true,
        margins: { marginType: 'default' },
      }),
    );
  } catch (error) {
    console.error('[PrintPreview] printToPDF 失败', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成打印预览失败',
    };
  }

  const tempDir = await fs.mkdtemp(path.join(app.getPath('temp'), 'md2vsf-print-'));
  const pdfPath = path.join(tempDir, 'preview.pdf');
  await fs.writeFile(pdfPath, pdfBuffer);

  console.log('[PrintPreview] PDF 已生成', { pdfPath, bytes: pdfBuffer.length });

  const previewWin = new BrowserWindow({
    width: 1024,
    height: 820,
    minWidth: 720,
    minHeight: 480,
    title: '打印预览',
    parent: parent ?? undefined,
    modal: Boolean(parent),
    show: false,
    webPreferences: {
      preload: getShellPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const session: PreviewSession = { window: previewWin, tempDir, pdfPath };
  activePreview = session;

  previewWin.on('closed', () => {
    if (activePreview === session) {
      activePreview = null;
    }
    void fs.rm(tempDir, { recursive: true, force: true });
  });

  const pdfUrl = pathToFileURL(pdfPath).href;
  const shellUrl = `${pathToFileURL(getShellHtmlPath()).href}?src=${encodeURIComponent(pdfUrl)}`;

  try {
    await previewWin.loadURL(shellUrl);
    previewWin.show();
    previewWin.focus();
    console.log('[PrintPreview] 预览窗口已打开');
    return { success: true };
  } catch (error) {
    activePreview = null;
    await cleanupSession(session);
    console.error('[PrintPreview] 打开预览窗口失败', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '打开打印预览失败',
    };
  }
}
