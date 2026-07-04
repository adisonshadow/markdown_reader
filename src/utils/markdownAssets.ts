const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const HTML_IMAGE_PATTERN = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;

function isExternalAssetRef(href: string): boolean {
  return /^(https?:|data:|mailto:|#)/i.test(href.trim());
}

export function extractImageRefs(content: string): string[] {
  const refs = new Set<string>();

  for (const match of content.matchAll(MARKDOWN_IMAGE_PATTERN)) {
    const href = match[1]?.trim();
    if (href && !isExternalAssetRef(href)) {
      refs.add(href);
    }
  }

  for (const match of content.matchAll(HTML_IMAGE_PATTERN)) {
    const href = match[1]?.trim();
    if (href && !isExternalAssetRef(href)) {
      refs.add(href);
    }
  }

  return Array.from(refs);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
