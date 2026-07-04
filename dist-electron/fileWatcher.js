"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownFileWatcher = exports.MarkdownFileWatcher = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DEBOUNCE_MS = 300;
function watchKey(webContentsId, sourcePath) {
    return `${webContentsId}:${sourcePath}`;
}
class MarkdownFileWatcher {
    watches = new Map();
    watch(webContents, sourcePath, onChange) {
        const resolved = path_1.default.resolve(sourcePath);
        this.unwatch(webContents.id, resolved);
        const entry = {
            watcher: null,
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
        const dir = path_1.default.dirname(resolved);
        const base = path_1.default.basename(resolved);
        try {
            entry.watcher = fs_1.default.watch(dir, (_event, filename) => {
                if (filename === null || filename === base) {
                    schedule();
                }
            });
        }
        catch (error) {
            console.error('[FileWatch] 无法监听:', resolved, error);
            return;
        }
        this.watches.set(watchKey(webContents.id, resolved), entry);
        console.log('[FileWatch] 开始监听:', resolved);
    }
    unwatch(webContentsId, sourcePath) {
        const resolved = path_1.default.resolve(sourcePath);
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
    unwatchAllForWebContents(webContentsId) {
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
exports.MarkdownFileWatcher = MarkdownFileWatcher;
exports.markdownFileWatcher = new MarkdownFileWatcher();
