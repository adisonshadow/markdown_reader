import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import path from 'path';
import { MDSCAPE_SETTINGS_FILE } from './mdscapeProject';

export async function loadProjectSettings(projectPath: string): Promise<unknown | null> {
  const settingsPath = path.join(projectPath, MDSCAPE_SETTINGS_FILE);
  try {
    await fs.access(settingsPath, fsConstants.R_OK);
    return JSON.parse(await fs.readFile(settingsPath, 'utf-8'));
  } catch {
    return null;
  }
}

export async function saveProjectSettings(projectPath: string, settings: unknown): Promise<void> {
  const settingsPath = path.join(projectPath, MDSCAPE_SETTINGS_FILE);
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  console.log('[Mdscape] 已保存设置:', settingsPath);
}
