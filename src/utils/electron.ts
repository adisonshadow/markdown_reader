import type {
  OpenedMarkdownFile,
  ExportPdfResult,
  ExportDocxResult,
  ExportSaveDialogResult,
  ExportSaveDialogType,
  PrintPreviewResult,
} from '../types/electron';
import type { MermaidPngPayload } from '../types/electron';
import type { MarkdownFile, ReaderSettings } from '../types';

export function isElectron(): boolean {
  return Boolean(window.electronAPI?.isElectron);
}

export function toMarkdownFile(opened: OpenedMarkdownFile): MarkdownFile {
  return {
    path: opened.path,
    name: opened.name,
    content: opened.content,
    lastModified: opened.lastModified,
    sourcePath: opened.sourcePath,
    projectPath: opened.projectPath,
  };
}

export async function openFileDialog(): Promise<MarkdownFile | null> {
  if (!window.electronAPI) {
    return null;
  }
  const result = await window.electronAPI.openFileDialog();
  return result ? toMarkdownFile(result) : null;
}

export async function openFileByPath(filePath: string): Promise<MarkdownFile> {
  if (!window.electronAPI) {
    throw new Error('仅 Electron 环境支持按路径打开文件');
  }
  const result = await window.electronAPI.openFileByPath(filePath);
  return toMarkdownFile(result);
}

export function watchMarkdownFile(
  sourcePath: string,
  onChanged: (file: MarkdownFile) => void,
): () => void {
  if (!window.electronAPI) {
    return () => {};
  }

  const unsubscribe = window.electronAPI.onMarkdownFileChanged((opened) => {
    onChanged(toMarkdownFile(opened));
  });

  void window.electronAPI.watchMarkdownFile(sourcePath);

  return () => {
    unsubscribe();
    void window.electronAPI!.unwatchMarkdownFile(sourcePath);
  };
}

export async function reloadMarkdownFromSource(sourcePath: string): Promise<MarkdownFile> {
  if (!window.electronAPI) {
    throw new Error('仅 Electron 环境支持从源文件刷新');
  }
  const result = await window.electronAPI.reloadMarkdownFromSource(sourcePath);
  return toMarkdownFile(result);
}

export async function showExportSaveDialog(
  type: ExportSaveDialogType,
  defaultFileName: string,
): Promise<ExportSaveDialogResult> {
  if (!window.electronAPI) {
    return { canceled: true };
  }
  return window.electronAPI.showExportSaveDialog(type, defaultFileName);
}

export async function savePdfToPath(filePath: string): Promise<ExportPdfResult> {
  if (!window.electronAPI) {
    return { success: false, error: '仅 Electron 环境支持 PDF 导出' };
  }
  return window.electronAPI.savePdfToPath(filePath);
}

export async function saveDocxToPath(
  htmlContent: string,
  filePath: string,
): Promise<ExportDocxResult> {
  if (!window.electronAPI) {
    return { success: false, error: '仅 Electron 环境支持 DOCX 导出' };
  }
  return window.electronAPI.saveDocxToPath(htmlContent, filePath);
}

export async function openPrintPreview(): Promise<PrintPreviewResult> {
  if (!window.electronAPI) {
    return { success: false, error: '仅 Electron 环境支持打印预览' };
  }
  return window.electronAPI.openPrintPreview();
}

export async function getMermaidCacheDataUrl(
  projectPath: string,
  hash: string,
): Promise<string | null> {
  if (!window.electronAPI) {
    return null;
  }
  return window.electronAPI.getMermaidCacheDataUrl(projectPath, hash);
}

export async function getMermaidCachePath(
  projectPath: string,
  hash: string,
): Promise<string | null> {
  if (!window.electronAPI) {
    return null;
  }
  return window.electronAPI.getMermaidCachePath(projectPath, hash);
}

export async function saveMermaidCache(
  projectPath: string,
  hash: string,
  pngBase64: string,
): Promise<string | null> {
  if (!window.electronAPI) {
    return null;
  }
  return window.electronAPI.saveMermaidCache(projectPath, hash, pngBase64);
}

export async function convertSvgToPngBase64(svg: string): Promise<MermaidPngPayload> {
  if (!window.electronAPI) {
    throw new Error('SVG 转 PNG 需要 Electron 环境');
  }
  return window.electronAPI.convertSvgToPng(svg);
}

export async function loadProjectSettings(projectPath: string): Promise<ReaderSettings | null> {
  if (!window.electronAPI) {
    return null;
  }
  const raw = await window.electronAPI.loadProjectSettings(projectPath);
  return raw ? (raw as ReaderSettings) : null;
}

export async function saveProjectSettings(
  projectPath: string,
  settings: ReaderSettings,
): Promise<void> {
  if (!window.electronAPI) {
    return;
  }
  await window.electronAPI.saveProjectSettings(projectPath, settings);
}

export async function resolveLocalAssetUrls(
  markdownPath: string,
  hrefs: string[],
): Promise<Record<string, string>> {
  if (!window.electronAPI || hrefs.length === 0) {
    return {};
  }

  return window.electronAPI.resolveAssetUrls(markdownPath, hrefs);
}

export async function resolveLocalAssetUrl(
  markdownPath: string,
  assetHref: string,
): Promise<string | null> {
  if (/^(https?:|data:)/i.test(assetHref)) {
    return assetHref;
  }

  if (!window.electronAPI) {
    return null;
  }

  try {
    return await window.electronAPI.resolveAssetUrl(markdownPath, assetHref);
  } catch {
    return null;
  }
}

export async function openFileFromBrowser(file: File): Promise<MarkdownFile> {
  const content = await file.text();
  return {
    path: file.name,
    name: file.name,
    content,
    lastModified: file.lastModified,
  };
}
