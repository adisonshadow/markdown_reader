import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Layout, Button, Typography, Space, message } from 'antd';
import {
  SettingOutlined,
  ArrowLeftOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  FileWordOutlined,
} from '@ant-design/icons';
import { SettingsPanel } from '../components/SettingsPanel';
import { SettingsStyleInjector } from '../components/SettingsStyleInjector';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { ExportProgressOverlay } from '../components/ExportProgressOverlay';
import { SettingsProvider, useSettingsContext } from '../contexts/SettingsContext';
import { MermaidRegistryProvider, useMermaidRegistry } from '../contexts/MermaidRegistryContext';
import { isElectron, openPrintPreview, reloadMarkdownFromSource, saveDocxToPath, savePdfToPath, showExportSaveDialog, watchMarkdownFile } from '../utils/electron';
import {
  countMermaidBlocks,
  prepareExportContent,
  waitForMermaidRendered,
} from '../utils/exportPrepare';
import { buildMarkdownTypographyCss } from '../utils/themes';
import type { MarkdownFile } from '../types';
import type { ExportProgressState, ExportProgressUpdate } from '../types/export';
import { initialExportProgress } from '../types/export';

const { Header, Content } = Layout;
const { Text } = Typography;

interface PreviewPageProps {
  file: MarkdownFile;
  onBack: () => void;
  onFileUpdate?: (file: MarkdownFile, options?: { force?: boolean }) => void;
}

type ExportKind = 'pdf' | 'docx';

function getExportRoot(): HTMLElement | null {
  return document.getElementById('print-root');
}

function getDefaultPdfName(fileName: string): string {
  return fileName.replace(/\.(md|markdown)$/i, '') + '.pdf';
}

function getDefaultDocxName(fileName: string): string {
  return fileName.replace(/\.(md|markdown)$/i, '') + '.docx';
}

const EXPORT_ERROR_HIDE_MS = 30_000;
const EXPORT_SUCCESS_HIDE_MS = 5_000;
const EXPORT_CANCELED_HIDE_MS = 2_000;

function formatExportError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function logExportFailure(context: string, details: Record<string, unknown>, error?: unknown) {
  const formatted = error !== undefined ? formatExportError(error) : undefined;
  console.error(`[Export] ${context}`, {
    ...details,
    ...(formatted
      ? {
          errorMessage: formatted.message,
          errorStack: formatted.stack,
        }
      : {}),
  });
}

function showExportError(
  updateProgress: (update: ExportProgressUpdate) => void,
  scheduleHide: (delayMs: number) => void,
  title: string,
  message: string,
  debugContext: Record<string, unknown>,
  error?: unknown,
) {
  logExportFailure('导出失败', { ...debugContext, uiMessage: message }, error);
  updateProgress({
    phase: 'error',
    title,
    message: `${message}${message.endsWith('。') ? '' : '。'}（${Math.round(EXPORT_ERROR_HIDE_MS / 1000)} 秒后自动关闭，详见控制台 [Export] 日志）`,
  });
  scheduleHide(EXPORT_ERROR_HIDE_MS);
}

const PreviewPageContent: React.FC<PreviewPageProps> = ({ file, onBack, onFileUpdate }) => {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<ExportProgressState>(initialExportProgress);
  const { settings } = useSettingsContext();
  const { requestRestore, getEntries } = useMermaidRegistry();
  const projectPath = file.projectPath ?? '';
  const assetBasePath = file.sourcePath ?? file.path;
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const sourcePath = file.sourcePath ?? file.path;
    if (!isElectron() || !sourcePath) {
      return;
    }
    return watchMarkdownFile(sourcePath, (updated) => {
      onFileUpdate?.(updated);
    });
  }, [file.sourcePath, file.path, onFileUpdate]);

  const clearHideTimer = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const updateProgress = (update: ExportProgressUpdate) => {
    setProgress((prev) => ({
      visible: true,
      phase: update.phase,
      title: update.title ?? prev.title,
      message: update.message,
      current: update.current,
      total: update.total,
      filePath: update.filePath,
    }));
  };

  const scheduleHide = (delayMs: number) => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setProgress(initialExportProgress);
    }, delayMs);
  };

  const runExport = async (kind: ExportKind) => {
    const exportTitle = kind === 'pdf' ? '导出 PDF' : '导出 DOCX';
    const exportDebugBase = {
      kind,
      fileName: file.name,
      sourcePath: file.sourcePath ?? file.path,
      projectPath,
      contentLength: file.content.length,
    };
    let mermaidTotal = 0;
    let preparedHtmlLength = 0;
    let targetFilePath: string | undefined;

    if (!isElectron()) {
      showExportError(
        updateProgress,
        scheduleHide,
        exportTitle,
        '导出功能仅在 Electron 桌面版可用',
        exportDebugBase,
      );
      return;
    }

    const root = getExportRoot();
    if (!root) {
      showExportError(
        updateProgress,
        scheduleHide,
        exportTitle,
        '未找到可导出的文档内容',
        exportDebugBase,
      );
      return;
    }

    clearHideTimer();
    setExporting(true);

    updateProgress({
      phase: 'waiting',
      title: exportTitle,
      message: '正在等待 Mermaid 图表渲染完成…',
    });

    let restore: (() => Promise<void>) | null = null;
    let preparedHtml: string | null = null;

    try {
      mermaidTotal = countMermaidBlocks(root, getEntries);
      console.log('[Export] 开始导出', { ...exportDebugBase, mermaidTotal });

      if (kind === 'pdf') {
        // PDF 直接 printToPDF 捕获页内 SVG，无需转 PNG
        await waitForMermaidRendered();
      } else {
        if (mermaidTotal > 0) {
          updateProgress({
            phase: 'caching',
            title: exportTitle,
            message: `正在处理 Mermaid 图表（0/${mermaidTotal}）…`,
            current: 0,
            total: mermaidTotal,
          });
        }

        const onMermaidProgress = mermaidTotal > 0
          ? (info: { current: number; total: number; cached: boolean }) => {
              updateProgress({
                phase: 'caching',
                title: exportTitle,
                message: info.cached
                  ? `使用缓存图表（${info.current}/${info.total}）…`
                  : `正在生成图表（${info.current}/${info.total}）…`,
                current: info.current,
                total: info.total,
              });
            }
          : undefined;

        updateProgress({
          phase: 'building',
          title: exportTitle,
          message: mermaidTotal > 0 ? '正在嵌入图表并构建文档…' : '正在构建文档…',
        });
        const stylesCss = buildMarkdownTypographyCss(settings);
        const prepared = await prepareExportContent(
          root,
          projectPath,
          stylesCss,
          onMermaidProgress,
          {
            requestRestore,
            getRegistryEntries: getEntries,
            mermaidBackground: settings.colors.background,
          },
        );
        restore = prepared.restore;
        preparedHtml = prepared.html;
        preparedHtmlLength = prepared.html.length;
        console.log('[Export] DOCX HTML 已构建', {
          ...exportDebugBase,
          mermaidTotal,
          preparedHtmlLength,
          embeddedImages: (prepared.html.match(/data:image\/png;base64/g) ?? []).length,
        });
      }

      updateProgress({
        phase: 'embedding',
        title: exportTitle,
        message: '正在准备导出视图…',
      });

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      updateProgress({
        phase: 'dialog',
        title: exportTitle,
        message: '处理完成，请选择保存位置…',
      });

      await new Promise((resolve) => requestAnimationFrame(resolve));

      const defaultName = kind === 'pdf' ? getDefaultPdfName(file.name) : getDefaultDocxName(file.name);
      console.log('[Export] 准备打开保存对话框:', kind, defaultName);
      const dialogResult = await showExportSaveDialog(kind, defaultName);
      console.log('[Export] 保存对话框结果:', dialogResult);

      if (dialogResult.canceled || !dialogResult.filePath) {
        updateProgress({
          phase: 'canceled',
          title: exportTitle,
          message: '已取消保存',
        });
        scheduleHide(EXPORT_CANCELED_HIDE_MS);
        return;
      }

      targetFilePath = dialogResult.filePath;

      updateProgress({
        phase: 'saving',
        title: exportTitle,
        message: '正在写入文件…',
      });

      // printToPDF 会捕获整页；fixed 定位的进度面板会重复出现在每一页，写入前必须隐藏
      if (kind === 'pdf') {
        flushSync(() => {
          setProgress((prev) => ({ ...prev, visible: false }));
        });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }

      console.log('[Export] 开始写入文件', {
        ...exportDebugBase,
        kind,
        targetFilePath,
        preparedHtmlLength,
        mermaidTotal,
      });

      const saveResult =
        kind === 'pdf'
          ? await savePdfToPath(dialogResult.filePath)
          : await saveDocxToPath(preparedHtml ?? '', dialogResult.filePath);

      console.log('[Export] 写入结果', saveResult);

      if (saveResult.success) {
        updateProgress({
          phase: 'success',
          title: exportTitle,
          message: '导出成功',
          filePath: saveResult.filePath,
        });
        scheduleHide(EXPORT_SUCCESS_HIDE_MS);
      } else {
        showExportError(
          updateProgress,
          scheduleHide,
          exportTitle,
          saveResult.error ?? '导出失败',
          {
            ...exportDebugBase,
            mermaidTotal,
            preparedHtmlLength,
            targetFilePath,
            saveResult,
          },
        );
      }
    } catch (error) {
      showExportError(
        updateProgress,
        scheduleHide,
        exportTitle,
        error instanceof Error ? error.message : '导出过程中发生错误',
        {
          ...exportDebugBase,
          mermaidTotal,
          preparedHtmlLength,
          targetFilePath,
        },
        error,
      );
    } finally {
      if (restore) {
        try {
          await restore();
        } catch (restoreError) {
          logExportFailure('导出后恢复预览失败', exportDebugBase, restoreError);
        }
      }
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    try {
      const root = getExportRoot();
      if (root) {
        await waitForMermaidRendered();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }

      if (isElectron()) {
        flushSync(() => {
          setProgress((prev) => ({ ...prev, visible: false }));
        });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const result = await openPrintPreview();
        if (!result.success && result.error) {
          message.error(result.error);
        }
        return;
      }

      window.print();
    } catch (error) {
      console.error('[Print] 打印异常', error);
      message.error(error instanceof Error ? error.message : '打印失败');
    }
  };

  const handleRefreshFromSource = async () => {
    const sourcePath = file.sourcePath ?? file.path;
    if (!isElectron() || !sourcePath || exporting || refreshing) {
      return;
    }

    setRefreshing(true);
    try {
      const updated = await reloadMarkdownFromSource(sourcePath);
      onFileUpdate?.(updated, { force: true });
      message.success('已从原始文件同步最新内容');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '同步失败');
    } finally {
      setRefreshing(false);
    }
  };

  const canRefreshFromSource = isElectron() && Boolean(file.sourcePath ?? file.path);

  return (
    <>
      <SettingsStyleInjector settings={settings} />
      <Layout className="preview-layout">
        <Header className="preview-header">
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={onBack} disabled={exporting}>
              返回
            </Button>
            <Text
              ellipsis
              className={`preview-header__filename${canRefreshFromSource ? ' preview-header__filename--clickable' : ''}`}
              title={canRefreshFromSource ? '点击从原始文件同步最新内容' : undefined}
              onClick={canRefreshFromSource ? () => void handleRefreshFromSource() : undefined}
            >
              {refreshing ? '同步中… ' : ''}
              {file.name}
            </Text>
          </Space>
          <Space>
            <Button icon={<SettingOutlined />} onClick={() => setSettingsVisible(true)} disabled={exporting}>
              设置
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => void handlePrint()} disabled={exporting}>
              打印
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => void runExport('pdf')}
              loading={exporting}
              disabled={!isElectron() || exporting}
            >
              导出 PDF
            </Button>
            <Button
              icon={<FileWordOutlined />}
              onClick={() => void runExport('docx')}
              loading={exporting}
              disabled={!isElectron() || exporting}
            >
              导出 DOCX
            </Button>
          </Space>
        </Header>
        <Content className="preview-content">
          <ExportProgressOverlay state={progress} />
          <MarkdownRenderer
            content={file.content}
            filePath={assetBasePath}
            mermaidBackground={settings.colors.background}
          />
        </Content>
        <SettingsPanel open={settingsVisible} onClose={() => setSettingsVisible(false)} />
      </Layout>
    </>
  );
};

export const PreviewPage: React.FC<PreviewPageProps> = ({ file, onBack, onFileUpdate }) => {
  const projectPath = file.projectPath ?? '';

  return (
    <SettingsProvider projectPath={projectPath || undefined}>
      <MermaidRegistryProvider>
        <PreviewPageContent file={file} onBack={onBack} onFileUpdate={onFileUpdate} />
      </MermaidRegistryProvider>
    </SettingsProvider>
  );
};
