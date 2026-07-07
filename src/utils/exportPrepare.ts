import {
  getMermaidCacheDataUrl,
  getMermaidCachePath,
  saveMermaidCache,
  isElectron,
} from './electron';
import {
  extractMermaidSourceFromElement,
  initMermaid,
  normalizeMermaidSource,
  renderMermaidToPngBase64,
} from './mermaidPipeline';
import type { MermaidPrepareProgressCallback } from '../types/export';

/** 与 electron/svgToPng.ts 中 PNG_RENDER_SCALE 保持一致，用于从缓存图反推显示尺寸 */
const MERMAID_PNG_RENDER_SCALE = 3;
/** 升级 PNG 生成策略时递增，使旧缓存失效 */
const MERMAID_CACHE_VERSION = 'png-hq-v1';

export interface MermaidRegistryEntryLike {
  diagramId: string;
  source: string;
  element: HTMLElement | null;
}

export interface ExportMermaidOptions {
  requestRestore?: (diagramIds?: string[]) => void;
  getRegistryEntries?: () => MermaidRegistryEntryLike[];
  mermaidBackground?: string;
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

interface MermaidExportImage {
  dataUrl: string;
  displayWidth: number;
  displayHeight: number;
}

function measureDataUrlSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error('无法读取 Mermaid 图片尺寸'));
    img.src = dataUrl;
  });
}

async function getDisplaySizeFromDataUrl(
  dataUrl: string,
  fallbackWidth: number,
  fallbackHeight: number,
): Promise<{ displayWidth: number; displayHeight: number }> {
  if (fallbackWidth > 0 && fallbackHeight > 0) {
    return { displayWidth: fallbackWidth, displayHeight: fallbackHeight };
  }

  try {
    const { width, height } = await measureDataUrlSize(dataUrl);
    return {
      displayWidth: Math.max(1, Math.round(width / MERMAID_PNG_RENDER_SCALE)),
      displayHeight: Math.max(1, Math.round(height / MERMAID_PNG_RENDER_SCALE)),
    };
  } catch {
    return { displayWidth: fallbackWidth, displayHeight: fallbackHeight };
  }
}

async function getOrCreateMermaidImageDataUrl(
  projectPath: string,
  source: string,
  mermaidBackground: string,
  onItemDone?: (cached: boolean) => void,
): Promise<MermaidExportImage> {
  const normalized = normalizeMermaidSource(source);
  const hash = await sha256(`${MERMAID_CACHE_VERSION}\n${normalized}`);
  const cacheFileName = `${hash}.png`;

  if (isElectron() && projectPath) {
    const cachePath = await getMermaidCachePath(projectPath, hash);
    const cached = await getMermaidCacheDataUrl(projectPath, hash);
    if (cached) {
      console.log('[MermaidExport] 缓存命中', { hash, fileName: cacheFileName, path: cachePath });
      onItemDone?.(true);
      const { displayWidth, displayHeight } = await getDisplaySizeFromDataUrl(cached, 0, 0);
      return { dataUrl: cached, displayWidth, displayHeight };
    }
    console.log('[MermaidExport] 缓存未命中，开始生成', { hash, fileName: cacheFileName, path: cachePath });
  }

  initMermaid({ background: mermaidBackground });
  const renderId = `export-${hash.slice(0, 12)}`;
  const png = await renderMermaidToPngBase64(normalized, renderId, mermaidBackground);

  if (isElectron() && projectPath) {
    await saveMermaidCache(projectPath, hash, png.base64);
    const cachePath = await getMermaidCachePath(projectPath, hash);
    const saved = await getMermaidCacheDataUrl(projectPath, hash);
    if (saved) {
      console.log('[MermaidExport] 已写入缓存', { hash, fileName: cacheFileName, path: cachePath });
      onItemDone?.(false);
      return {
        dataUrl: saved,
        displayWidth: png.displayWidth,
        displayHeight: png.displayHeight,
      };
    }
  }

  onItemDone?.(false);
  return {
    dataUrl: `data:image/png;base64,${png.base64}`,
    displayWidth: png.displayWidth,
    displayHeight: png.displayHeight,
  };
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
  displayWidth: number;
  displayHeight: number;
}

function collectMermaidBlocks(
  container: HTMLElement,
  getRegistryEntries?: () => MermaidRegistryEntryLike[],
): MermaidBlockInfo[] {
  const registryMap = new Map(
    (getRegistryEntries?.() ?? []).map((entry) => [entry.diagramId, entry]),
  );

  const fromDom = Array.from(container.querySelectorAll('.mermaid[data-diagram-id]'))
    .map((element) => {
      const block = element as HTMLElement;
      const diagramId = block.getAttribute('data-diagram-id');
      if (!diagramId) {
        return null;
      }

      const source =
        extractMermaidSourceFromElement(block) || registryMap.get(diagramId)?.source || '';
      return source ? { block, diagramId, source } : null;
    })
    .filter((item): item is MermaidBlockInfo => item !== null);

  if (fromDom.length > 0) {
    return fromDom;
  }

  return (getRegistryEntries?.() ?? [])
    .map((entry) => {
      if (!entry.source || !entry.element?.isConnected || !container.contains(entry.element)) {
        return null;
      }
      return {
        block: entry.element,
        diagramId: entry.diagramId,
        source: entry.source,
      };
    })
    .filter((item): item is MermaidBlockInfo => item !== null);
}

async function buildMermaidImageMap(
  projectPath: string,
  blocks: MermaidBlockInfo[],
  mermaidBackground: string,
  onProgress?: MermaidPrepareProgressCallback,
): Promise<Map<string, MermaidExportImage>> {
  const uniqueSources = [...new Set(blocks.map((item) => normalizeMermaidSource(item.source)))];
  const imageMap = new Map<string, MermaidExportImage>();
  const total = uniqueSources.length;
  let current = 0;

  if (total === 0) {
    return imageMap;
  }

  for (const source of uniqueSources) {
    const image = await getOrCreateMermaidImageDataUrl(
      projectPath,
      source,
      mermaidBackground,
      (cached) => {
        current += 1;
        onProgress?.({ current, total, cached });
      },
    );
    imageMap.set(source, image);
  }

  return imageMap;
}

function applyExportImages(
  blocks: MermaidBlockInfo[],
  imageMap: Map<string, MermaidExportImage>,
): ExportImageEntry[] {
  const entries: ExportImageEntry[] = [];

  for (const { block, diagramId, source } of blocks) {
    const normalized = normalizeMermaidSource(source);
    const image = imageMap.get(normalized);
    if (!image) {
      continue;
    }

    entries.push({
      block,
      diagramId,
      source: normalized,
      dataUrl: image.dataUrl,
      displayWidth: image.displayWidth,
      displayHeight: image.displayHeight,
    });

    block.classList.add('mermaid-export-image');
    block.innerHTML = '';
    block.removeAttribute('data-processed');

    const img = document.createElement('img');
    img.src = image.dataUrl;
    img.alt = 'Mermaid 图表';
    img.className = 'mermaid-export-img';
    img.width = image.displayWidth;
    img.height = image.displayHeight;
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

/** 去掉包裹 Mermaid 导出图的 <pre>，避免 html-to-docx 将其当代码块 */
function postProcessExportBodyHtml(bodyHtml: string): string {
  let html = bodyHtml;

  html = html.replace(
    /<pre[^>]*>\s*(<div class="[^"]*\bmermaid-export-image\b[^"]*"[\s\S]*?<\/div>)\s*<\/pre>/gi,
    '$1',
  );

  html = html.replace(
    /<pre[^>]*>\s*(<div class="[^"]*\bmermaid\b[^"]*"[\s\S]*?<img class="mermaid-export-img"[\s\S]*?<\/div>)\s*<\/pre>/gi,
    '$1',
  );

  return html;
}

export async function prepareMermaidForExport(
  container: HTMLElement,
  projectPath: string,
  onProgress?: MermaidPrepareProgressCallback,
  options?: ExportMermaidOptions,
): Promise<() => Promise<void>> {
  const mermaidBackground = options?.mermaidBackground ?? '#ffffff';

  await waitForMermaidRendered();

  const blocks = collectMermaidBlocks(container, options?.getRegistryEntries);
  if (blocks.length === 0) {
    return async () => {};
  }

  console.log('[MermaidExport] 开始处理图表块:', blocks.length, '项目:', projectPath);

  const imageMap = await buildMermaidImageMap(
    projectPath,
    blocks,
    mermaidBackground,
    onProgress,
  );

  const freshBlocks = collectMermaidBlocks(container, options?.getRegistryEntries);
  const targetBlocks = freshBlocks.length > 0 ? freshBlocks : blocks;
  const entries = applyExportImages(targetBlocks, imageMap);

  console.log('[MermaidExport] 已替换为图片:', entries.length, '/', targetBlocks.length);

  if (targetBlocks.length > 0 && entries.length === 0) {
    console.error('[MermaidExport] 替换失败', {
      targetBlocks: targetBlocks.length,
      entries: entries.length,
      projectPath,
      sources: targetBlocks.map((item) => normalizeMermaidSource(item.source).slice(0, 80)),
    });
    throw new Error('未能将 Mermaid 图表替换为图片');
  }

  return async () => {
    restoreExportImages(entries, options);
  };
}

export function buildExportHtml(bodyHtml: string, stylesCss: string): string {
  const processedBody = postProcessExportBodyHtml(bodyHtml);

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
  <div class="markdown-body">${processedBody}</div>
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

export function countMermaidBlocks(
  container: HTMLElement,
  getRegistryEntries?: () => MermaidRegistryEntryLike[],
): number {
  return collectMermaidBlocks(container, getRegistryEntries).length;
}
