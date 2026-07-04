import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import path from 'path';
import { getMermaidCacheDir } from './mdscapeProject';

export function getMermaidCachePath(projectPath: string, hash: string): string {
  return path.join(getMermaidCacheDir(projectPath), `${hash}.png`);
}

export async function getMermaidCacheDataUrl(
  projectPath: string,
  hash: string,
): Promise<string | null> {
  const filePath = getMermaidCachePath(projectPath, hash);
  try {
    await fs.access(filePath, fsConstants.R_OK);
    const buffer = await fs.readFile(filePath);
    console.log('[MermaidCache] 命中缓存:', filePath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function saveMermaidCache(
  projectPath: string,
  hash: string,
  pngBase64: string,
): Promise<string> {
  const dir = getMermaidCacheDir(projectPath);
  await fs.mkdir(dir, { recursive: true });
  const filePath = getMermaidCachePath(projectPath, hash);
  await fs.writeFile(filePath, Buffer.from(pngBase64, 'base64'));
  console.log('[MermaidCache] 已写入缓存:', filePath);
  return filePath;
}
