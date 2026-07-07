"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePrintPreview = closePrintPreview;
exports.printFromPreview = printFromPreview;
exports.openPrintPreview = openPrintPreview;
const electron_1 = require("electron");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
let activePreview = null;
function getShellHtmlPath() {
    return path_1.default.join(__dirname, 'printPreviewShell.html');
}
function getShellPreloadPath() {
    return path_1.default.join(__dirname, 'printPreviewPreload.js');
}
async function cleanupSession(session) {
    if (!session) {
        return;
    }
    if (!session.window.isDestroyed()) {
        session.window.destroy();
    }
    try {
        await promises_1.default.rm(session.tempDir, { recursive: true, force: true });
    }
    catch (error) {
        console.warn('[PrintPreview] 清理临时目录失败:', error);
    }
}
async function closePrintPreview() {
    const session = activePreview;
    activePreview = null;
    await cleanupSession(session);
}
async function printFromPreview() {
    const session = activePreview;
    if (!session || session.window.isDestroyed()) {
        return { success: false, error: '打印预览窗口不可用' };
    }
    const pdfWin = new electron_1.BrowserWindow({
        show: false,
        webPreferences: {
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    try {
        await pdfWin.loadFile(session.pdfPath);
        await new Promise((resolve) => {
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
    }
    finally {
        if (!pdfWin.isDestroyed()) {
            pdfWin.destroy();
        }
    }
}
async function openPrintPreview(sourceWebContents, parentWindow) {
    const parent = parentWindow && !parentWindow.isDestroyed() ? parentWindow : null;
    if (activePreview && !activePreview.window.isDestroyed()) {
        activePreview.window.focus();
        return { success: true };
    }
    await closePrintPreview();
    console.log('[PrintPreview] 生成 PDF 用于预览…');
    let pdfBuffer;
    try {
        pdfBuffer = Buffer.from(await sourceWebContents.printToPDF({
            printBackground: true,
            margins: { marginType: 'default' },
        }));
    }
    catch (error) {
        console.error('[PrintPreview] printToPDF 失败', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '生成打印预览失败',
        };
    }
    const tempDir = await promises_1.default.mkdtemp(path_1.default.join(electron_1.app.getPath('temp'), 'md2vsf-print-'));
    const pdfPath = path_1.default.join(tempDir, 'preview.pdf');
    await promises_1.default.writeFile(pdfPath, pdfBuffer);
    console.log('[PrintPreview] PDF 已生成', { pdfPath, bytes: pdfBuffer.length });
    const previewWin = new electron_1.BrowserWindow({
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
    const session = { window: previewWin, tempDir, pdfPath };
    activePreview = session;
    previewWin.on('closed', () => {
        if (activePreview === session) {
            activePreview = null;
        }
        void promises_1.default.rm(tempDir, { recursive: true, force: true });
    });
    const pdfUrl = (0, url_1.pathToFileURL)(pdfPath).href;
    const shellUrl = `${(0, url_1.pathToFileURL)(getShellHtmlPath()).href}?src=${encodeURIComponent(pdfUrl)}`;
    try {
        await previewWin.loadURL(shellUrl);
        previewWin.show();
        previewWin.focus();
        console.log('[PrintPreview] 预览窗口已打开');
        return { success: true };
    }
    catch (error) {
        activePreview = null;
        await cleanupSession(session);
        console.error('[PrintPreview] 打开预览窗口失败', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '打开打印预览失败',
        };
    }
}
