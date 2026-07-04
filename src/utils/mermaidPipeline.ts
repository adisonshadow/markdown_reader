import mermaid from 'mermaid';
import { convertSvgToPngBase64 } from './electron';

export function normalizeMermaidSource(source: string): string {
  return source.replace(/\r\n/g, '\n').trim();
}

function getMermaidTheme(background: string): 'default' | 'dark' {
  const color = background.trim().toLowerCase();
  if (color === '#fff' || color === '#ffffff' || color === 'white') {
    return 'default';
  }

  const hex = color.replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? 'default' : 'dark';
  }

  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? 'default' : 'dark';
  }

  return 'default';
}

let lastBackground = '#ffffff';

export function initMermaid(options: { background: string }): void {
  lastBackground = options.background;
  mermaid.initialize({
    startOnLoad: false,
    theme: getMermaidTheme(options.background),
    securityLevel: 'strict',
  });
}

export async function renderMermaidToSvg(
  source: string,
  diagramId: string,
  background = lastBackground,
): Promise<string> {
  const normalized = normalizeMermaidSource(source);
  initMermaid({ background });
  const { svg } = await mermaid.render(diagramId, normalized);
  return svg;
}

export async function renderMermaidToPngBase64(
  source: string,
  diagramId: string,
  background = lastBackground,
): Promise<string> {
  const svg = await renderMermaidToSvg(source, diagramId, background);
  return convertSvgToPngBase64(svg);
}

export function extractMermaidSourceFromElement(element: HTMLElement): string {
  const encoded = element.getAttribute('data-source');
  if (encoded) {
    return decodeURIComponent(encoded);
  }
  return element.dataset.mermaidSource ?? '';
}
