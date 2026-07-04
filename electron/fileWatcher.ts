import fs from 'fs';
import path from 'path';
import type { WebContents } from 'electron';

const DEBOUNCE_MS = 300;

interface WatchEntry {
  watcher: fs.FSWatcher;
  debounceTimer: ReturnType<typeof setTimeout> | null;
}

function watchKey(webContentsId: number, sourcePath: string): string {
  return `${webContentsId}:${sourcePath}`;
}

export class MarkdownFileWatcher {
  private watches = new Map<string, WatchEntry>();

  watch(
    webContents: WebContents,
    sourcePath: string,
    onChange: () => void | Promise<void>,
  ): void {
    const resolved = path.resolve(sourcePath);
    this.unwatch(webContents.id, resolved);

    const entry: WatchEntry = {
      watcher: null as unknown as fs.FSWatcher,
      debounceTimer: null,
    };

    const schedule = () => {
      if (entry.debounceTimer) {
        clearTimeout(entry.debounceTimer);
      }
      entry.debounceTimer = setTimeout(() => {
        entry.debounceTimer = null;
        void Promise.resolve(onChange()).catch((error) => {
          console.error('[FileWatch] 重新加载失败:', error);
        });
      }, DEBOUNCE_MS);
    };

    const dir = path.dirname(resolved);
    const base = path.basename(resolved);

    try {
      entry.watcher = fs.watch(dir, (_event, filename) => {
        if (filename === null || filename === base) {
          schedule();
        }
      });
    } catch (error) {
      console.error('[FileWatch] 无法监听:', resolved, error);
      return;
    }

    this.watches.set(watchKey(webContents.id, resolved), entry);
    console.log('[FileWatch] 开始监听:', resolved);
  }

  unwatch(webContentsId: number, sourcePath: string): void {
    const resolved = path.resolve(sourcePath);
    const key = watchKey(webContentsId, resolved);
    const entry = this.watches.get(key);
    if (!entry) {
      return;
    }

    if (entry.debounceTimer) {
      clearTimeout(entry.debounceTimer);
    }
    entry.watcher.close();
    this.watches.delete(key);
    console.log('[FileWatch] 停止监听:', resolved);
  }

  unwatchAllForWebContents(webContentsId: number): void {
    for (const [key, entry] of this.watches.entries()) {
      if (!key.startsWith(`${webContentsId}:`)) {
        continue;
      }
      if (entry.debounceTimer) {
        clearTimeout(entry.debounceTimer);
      }
      entry.watcher.close();
      this.watches.delete(key);
    }
  }
}

export const markdownFileWatcher = new MarkdownFileWatcher();
