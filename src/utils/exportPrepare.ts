import {
  getMermaidCacheDataUrl,
  getMermaidCachePath,
  saveMermaidCache,
  isElectron,
} from './electron';
import {
  extractMermaidSourceFromElement,
  normalizeMermaidSource,
  renderMermaidToPngBase64,
} from './mermaidPipeline';
import type { MermaidPrepareProgressCallback } from '../types/export';

export interface ExportMermaidOptions {
  requestRestore?: (diagramIds?: string[]) => void;
}

export async function waitForMermaidRendered(timeoutMs = 10000): Promise<void> {
  const pending = document.querySelectorAll('.mermaid:not([data-processed])');
  if (pending.length === 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, timeoutMs);
    const observer = new MutationObserver(() => {
      const remaining = document.querySelectorAll('.mermaid:not([data-processed])');
      if (remaining.length === 0) {
        window.clearTimeout(timeout);
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-processed'],
    });
  });
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function getOrCreateMermaidImageDataUrl(
  projectPath: string,
  source: string,
  onItemDone?: (cached: boolean) => void,
): Promise<string> {
  const normalized = normalizeMermaidSource(source);
  const hash = await sha256(normalized);
  const cacheFileName = `${hash}.png`;

  if (isElectron() && projectPath) {
    const cachePath = await getMermaidCachePath(projectPath, hash);
    const cached = await getMermaidCacheDataUrl(projectPath, hash);
    if (cached) {
      console.log('[MermaidExport] 缓存命中', { hash, fileName: cacheFileName, path: cachePath });
      onItemDone?.(true);
      return cached;
    }
    console.log('[MermaidExport] 缓存未命中，开始生成', { hash, fileName: cacheFileName, path: cachePath });
  }

  const renderId = `export-${hash.slice(0, 12)}`;
  const pngBase64 = await renderMermaidToPngBase64(normalized, renderId);

  if (isElectron() && projectPath) {
    await saveMermaidCache(projectPath, hash, pngBase64);
    const cachePath = await getMermaidCachePath(projectPath, hash);
    const saved = await getMermaidCacheDataUrl(projectPath, hash);
    if (saved) {
      console.log('[MermaidExport] 已写入缓存', { hash, fileName: cacheFileName, path: cachePath });
      onItemDone?.(false);
      return saved;
    }
  }

  onItemDone?.(false);
  return `data:image/png;base64,${pngBase64}`;
}

interface MermaidBlockInfo {
  block: HTMLElement;
  diagramId: string;
  source: string;
}

interface ExportImageEntry {
  block: HTMLElement;
  diagramId: string;
  source: string;
  dataUrl: string;
}

function collectMermaidBlocks(container: HTMLElement): MermaidBlockInfo[] {
  return Array.from(container.querySelectorAll('.mermaid[data-diagram-id]'))
    .map((element) => {
      const block = element as HTMLElement;
      const diagramId = block.getAttribute('data-diagram-id');
      const source = extractMermaidSourceFromElement(block);
      return diagramId && source ? { block, diagramId, source } : null;
    })
    .filter((item): item is MermaidBlockInfo => item !== null);
}

async function buildMermaidImageMap(
  projectPath: string,
  blocks: MermaidBlockInfo[],
  onProgress?: MermaidPrepareProgressCallback,
): Promise<Map<string, string>> {
  const uniqueSources = [...new Set(blocks.map((item) => normalizeMermaidSource(item.source)))];
  const imageMap = new Map<string, string>();
  const total = uniqueSources.length;
  let current = 0;

  if (total === 0) {
    return imageMap;
  }

  for (const source of uniqueSources) {
    const dataUrl = await getOrCreateMermaidImageDataUrl(projectPath, source, (cached) => {
      current += 1;
      onProgress?.({ current, total, cached });
    });
    imageMap.set(source, dataUrl);
  }

  return imageMap;
}

function applyExportImages(
  blocks: MermaidBlockInfo[],
  imageMap: Map<string, string>,
): ExportImageEntry[] {
  const entries: ExportImageEntry[] = [];

  for (const { block, diagramId, source } of blocks) {
    const normalized = normalizeMermaidSource(source);
    const dataUrl = imageMap.get(normalized);
    if (!dataUrl) {
      continue;
    }

    entries.push({ block, diagramId, source: normalized, dataUrl });

    block.classList.add('mermaid-export-image');
    block.innerHTML = '';
    block.removeAttribute('data-processed');

    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'Mermaid 图表';
    img.className = 'mermaid-export-img';
    block.appendChild(img);
    block.setAttribute('data-processed', 'true');
  }

  return entries;
}

function restoreExportImages(
  entries: ExportImageEntry[],
  options?: ExportMermaidOptions,
): void {
  const diagramIds: string[] = [];

  for (const { block, diagramId } of entries) {
    if (!block.isConnected) {
      continue;
    }

    block.classList.remove('mermaid-export-image');
    block.innerHTML = '';
    block.removeAttribute('data-processed');
    diagramIds.push(diagramId);
  }

  options?.requestRestore?.(diagramIds);
}

export async function prepareMermaidForExport(
  container: HTMLElement,
  projectPath: string,
  onProgress?: MermaidPrepareProgressCallback,
  options?: ExportMermaidOptions,
): Promise<() => Promise<void>> {
  // DOCX 导出专用：html-to-docx 无法可靠嵌入 Mermaid SVG，需替换为 PNG 并写入缓存。
  // PDF 导出请直接 waitForMermaidRendered + printToPDF，保留页内矢量 SVG。
  await waitForMermaidRendered();

  const blocks = collectMermaidBlocks(container);
  if (blocks.length === 0) {
    return async () => {};
  }

  console.log('[MermaidExport] 开始处理图表块:', blocks.length, '项目:', projectPath);

  const imageMap = await buildMermaidImageMap(projectPath, blocks, onProgress);

  const freshBlocks = collectMermaidBlocks(container);
  const targetBlocks = freshBlocks.length > 0 ? freshBlocks : blocks;
  const entries = applyExportImages(targetBlocks, imageMap);

  console.log('[MermaidExport] 已替换为图片:', entries.length, '/', targetBlocks.length);

  if (targetBlocks.length > 0 && entries.length === 0) {
    throw new Error('未能将 Mermaid 图表替换为图片');
  }

  return async () => {
    restoreExportImages(entries, options);
  };
}

export function buildExportHtml(bodyHtml: string, stylesCss: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <style>
    ${stylesCss}
    .mermaid-export-image { display: block; text-align: center; margin: 24px 0; white-space: normal; font-size: initial; }
    .mermaid-export-img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="markdown-body">${bodyHtml}</div>
</body>
</html>`;
}

export async function prepareExportContent(
  container: HTMLElement,
  projectPath: string,
  stylesCss: string,
  onProgress?: MermaidPrepareProgressCallback,
  options?: ExportMermaidOptions,
): Promise<{ html: string; restore: () => Promise<void> }> {
  const restore = await prepareMermaidForExport(container, projectPath, onProgress, options);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const bodyHtml = container.innerHTML;
  const html = buildExportHtml(bodyHtml, stylesCss);
  return { html, restore };
}

export function countMermaidBlocks(container: HTMLElement): number {
  return collectMermaidBlocks(container).length;
}
