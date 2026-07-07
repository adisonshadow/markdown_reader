export interface OpenedMarkdownFile {
  path: string;
  name: string;
  content: string;
  lastModified: number;
  sourcePath: string;
  projectPath: string;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  canceled?: boolean;
  error?: string;
}

export type ExportPdfResult = ExportResult;
export type ExportDocxResult = ExportResult;
export type PrintPreviewResult = ExportResult;

export type ExportSaveDialogType = 'pdf' | 'docx';

export interface ExportSaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

export interface MermaidPngPayload {
  base64: string;
  displayWidth: number;
  displayHeight: number;
}

export interface ElectronAPI {
  openFileDialog: () => Promise<OpenedMarkdownFile | null>;
  openFileByPath: (filePath: string) => Promise<OpenedMarkdownFile>;
  watchMarkdownFile: (sourcePath: string) => Promise<void>;
  unwatchMarkdownFile: (sourcePath: string) => Promise<void>;
  reloadMarkdownFromSource: (sourcePath: string) => Promise<OpenedMarkdownFile>;
  onMarkdownFileChanged: (callback: (file: OpenedMarkdownFile) => void) => () => void;
  resolveAssetUrl: (baseFilePath: string, relativePath: string) => Promise<string>;
  resolveAssetUrls: (baseFilePath: string, hrefs: string[]) => Promise<Record<string, string>>;
  getMermaidCacheDataUrl: (projectPath: string, hash: string) => Promise<string | null>;
  getMermaidCachePath: (projectPath: string, hash: string) => Promise<string>;
  saveMermaidCache: (projectPath: string, hash: string, pngBase64: string) => Promise<string | null>;
  convertSvgToPng: (svg: string) => Promise<MermaidPngPayload>;
  loadProjectSettings: (projectPath: string) => Promise<unknown | null>;
  saveProjectSettings: (projectPath: string, settings: unknown) => Promise<{ success: boolean }>;
  showExportSaveDialog: (
    type: ExportSaveDialogType,
    defaultFileName: string,
  ) => Promise<ExportSaveDialogResult>;
  savePdfToPath: (filePath: string) => Promise<ExportPdfResult>;
  saveDocxToPath: (htmlContent: string, filePath: string) => Promise<ExportDocxResult>;
  openPrintPreview: () => Promise<PrintPreviewResult>;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
