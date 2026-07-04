import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import path from 'path';

export const MDSCAPE_META_FILE = 'meta.json';
export const MDSCAPE_SETTINGS_FILE = 'settings.json';
export const MDSCAPE_MERMAID_CACHE_DIR = 'mermaid-image-cache';

export interface MdscapeMeta {
  sourcePath: string;
  createdAt: number;
}

export function getProjectDirName(sourceFilePath: string): string {
  const ext = path.extname(sourceFilePath);
  const base = path.basename(sourceFilePath, ext);
  return `${base}_mdscape`;
}

export function getProjectPath(sourceFilePath: string): string {
  return path.join(path.dirname(sourceFilePath), getProjectDirName(sourceFilePath));
}

export function getWorkspaceMdPath(sourceFilePath: string): string {
  const projectPath = getProjectPath(sourceFilePath);
  return path.join(projectPath, path.basename(sourceFilePath));
}

export function getMermaidCacheDir(projectPath: string): string {
  return path.join(projectPath, MDSCAPE_MERMAID_CACHE_DIR);
}

export function isMdscapeProjectDir(dirPath: string): boolean {
  return path.basename(dirPath).endsWith('_mdscape');
}

export async function readMdscapeMeta(projectPath: string): Promise<MdscapeMeta | null> {
  const metaPath = path.join(projectPath, MDSCAPE_META_FILE);
  try {
    await fs.access(metaPath, fsConstants.R_OK);
    return JSON.parse(await fs.readFile(metaPath, 'utf-8')) as MdscapeMeta;
  } catch {
    return null;
  }
}

export async function writeMdscapeMeta(projectPath: string, meta: MdscapeMeta): Promise<void> {
  await fs.writeFile(
    path.join(projectPath, MDSCAPE_META_FILE),
    JSON.stringify(meta, null, 2),
    'utf-8',
  );
}

/** 将任意路径规范化为原始 Markdown 源文件路径 */
export async function resolveSourcePath(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);
  const parentDir = path.dirname(resolved);
  const parentName = path.basename(parentDir);

  if (parentName.endsWith('_mdscape')) {
    const meta = await readMdscapeMeta(parentDir);
    if (meta?.sourcePath) {
      return path.resolve(meta.sourcePath);
    }
  }

  return resolved;
}

export async function ensureMdscapeProject(sourceFilePath: string): Promise<{
  sourcePath: string;
  projectPath: string;
  workspacePath: string;
  created: boolean;
}> {
  const sourcePath = path.resolve(sourceFilePath);
  const projectPath = getProjectPath(sourcePath);
  const workspacePath = getWorkspaceMdPath(sourcePath);
  let created = false;

  try {
    await fs.access(projectPath, fsConstants.R_OK);
  } catch {
    created = true;
    await fs.mkdir(projectPath, { recursive: true });
    await writeMdscapeMeta(projectPath, { sourcePath, createdAt: Date.now() });
    const content = await fs.readFile(sourcePath, 'utf-8');
    await fs.writeFile(workspacePath, content, 'utf-8');
    console.log('[Mdscape] 创建项目:', projectPath);
  }

  await fs.mkdir(getMermaidCacheDir(projectPath), { recursive: true });

  try {
    await fs.access(workspacePath, fsConstants.R_OK);
  } catch {
    const content = await fs.readFile(sourcePath, 'utf-8');
    await fs.writeFile(workspacePath, content, 'utf-8');
  }

  if (!created) {
    const meta = await readMdscapeMeta(projectPath);
    if (!meta) {
      await writeMdscapeMeta(projectPath, { sourcePath, createdAt: Date.now() });
    }
    console.log('[Mdscape] 打开项目:', projectPath);
  }

  return { sourcePath, projectPath, workspacePath, created };
}

/** 源文件较新时，将内容同步到 mdscape 工作副本；force 为 true 时无条件从源文件覆盖 */
export async function syncSourceToWorkspace(
  sourcePath: string,
  workspacePath: string,
  force = false,
): Promise<boolean> {
  const resolvedSource = path.resolve(sourcePath);
  let sourceStat;

  try {
    sourceStat = await fs.stat(resolvedSource);
  } catch {
    return false;
  }

  if (!force) {
    let needsSync = true;
    try {
      const workspaceStat = await fs.stat(workspacePath);
      needsSync = sourceStat.mtimeMs > workspaceStat.mtimeMs;
    } catch {
      needsSync = true;
    }

    if (!needsSync) {
      return false;
    }
  }

  const content = await fs.readFile(resolvedSource, 'utf-8');
  await fs.writeFile(workspacePath, content, 'utf-8');
  console.log('[Mdscape] 已从源文件同步工作副本:', resolvedSource, force ? '(强制)' : '');
  return true;
}

export async function readWorkspaceMarkdown(
  sourcePath: string,
  projectPath: string,
  workspacePath: string,
) {
  const stat = await fs.stat(workspacePath);
  const content = await fs.readFile(workspacePath, 'utf-8');
  return {
    path: workspacePath,
    name: path.basename(workspacePath),
    content,
    lastModified: stat.mtimeMs,
    sourcePath,
    projectPath,
  };
}
