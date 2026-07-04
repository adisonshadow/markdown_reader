"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MDSCAPE_MERMAID_CACHE_DIR = exports.MDSCAPE_SETTINGS_FILE = exports.MDSCAPE_META_FILE = void 0;
exports.getProjectDirName = getProjectDirName;
exports.getProjectPath = getProjectPath;
exports.getWorkspaceMdPath = getWorkspaceMdPath;
exports.getMermaidCacheDir = getMermaidCacheDir;
exports.isMdscapeProjectDir = isMdscapeProjectDir;
exports.readMdscapeMeta = readMdscapeMeta;
exports.writeMdscapeMeta = writeMdscapeMeta;
exports.resolveSourcePath = resolveSourcePath;
exports.ensureMdscapeProject = ensureMdscapeProject;
exports.syncSourceToWorkspace = syncSourceToWorkspace;
exports.readWorkspaceMarkdown = readWorkspaceMarkdown;
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
exports.MDSCAPE_META_FILE = 'meta.json';
exports.MDSCAPE_SETTINGS_FILE = 'settings.json';
exports.MDSCAPE_MERMAID_CACHE_DIR = 'mermaid-image-cache';
function getProjectDirName(sourceFilePath) {
    const ext = path_1.default.extname(sourceFilePath);
    const base = path_1.default.basename(sourceFilePath, ext);
    return `${base}_mdscape`;
}
function getProjectPath(sourceFilePath) {
    return path_1.default.join(path_1.default.dirname(sourceFilePath), getProjectDirName(sourceFilePath));
}
function getWorkspaceMdPath(sourceFilePath) {
    const projectPath = getProjectPath(sourceFilePath);
    return path_1.default.join(projectPath, path_1.default.basename(sourceFilePath));
}
function getMermaidCacheDir(projectPath) {
    return path_1.default.join(projectPath, exports.MDSCAPE_MERMAID_CACHE_DIR);
}
function isMdscapeProjectDir(dirPath) {
    return path_1.default.basename(dirPath).endsWith('_mdscape');
}
async function readMdscapeMeta(projectPath) {
    const metaPath = path_1.default.join(projectPath, exports.MDSCAPE_META_FILE);
    try {
        await promises_1.default.access(metaPath, fs_1.constants.R_OK);
        return JSON.parse(await promises_1.default.readFile(metaPath, 'utf-8'));
    }
    catch {
        return null;
    }
}
async function writeMdscapeMeta(projectPath, meta) {
    await promises_1.default.writeFile(path_1.default.join(projectPath, exports.MDSCAPE_META_FILE), JSON.stringify(meta, null, 2), 'utf-8');
}
/** 将任意路径规范化为原始 Markdown 源文件路径 */
async function resolveSourcePath(filePath) {
    const resolved = path_1.default.resolve(filePath);
    const parentDir = path_1.default.dirname(resolved);
    const parentName = path_1.default.basename(parentDir);
    if (parentName.endsWith('_mdscape')) {
        const meta = await readMdscapeMeta(parentDir);
        if (meta?.sourcePath) {
            return path_1.default.resolve(meta.sourcePath);
        }
    }
    return resolved;
}
async function ensureMdscapeProject(sourceFilePath) {
    const sourcePath = path_1.default.resolve(sourceFilePath);
    const projectPath = getProjectPath(sourcePath);
    const workspacePath = getWorkspaceMdPath(sourcePath);
    let created = false;
    try {
        await promises_1.default.access(projectPath, fs_1.constants.R_OK);
    }
    catch {
        created = true;
        await promises_1.default.mkdir(projectPath, { recursive: true });
        await writeMdscapeMeta(projectPath, { sourcePath, createdAt: Date.now() });
        const content = await promises_1.default.readFile(sourcePath, 'utf-8');
        await promises_1.default.writeFile(workspacePath, content, 'utf-8');
        console.log('[Mdscape] 创建项目:', projectPath);
    }
    await promises_1.default.mkdir(getMermaidCacheDir(projectPath), { recursive: true });
    try {
        await promises_1.default.access(workspacePath, fs_1.constants.R_OK);
    }
    catch {
        const content = await promises_1.default.readFile(sourcePath, 'utf-8');
        await promises_1.default.writeFile(workspacePath, content, 'utf-8');
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
async function syncSourceToWorkspace(sourcePath, workspacePath, force = false) {
    const resolvedSource = path_1.default.resolve(sourcePath);
    let sourceStat;
    try {
        sourceStat = await promises_1.default.stat(resolvedSource);
    }
    catch {
        return false;
    }
    if (!force) {
        let needsSync = true;
        try {
            const workspaceStat = await promises_1.default.stat(workspacePath);
            needsSync = sourceStat.mtimeMs > workspaceStat.mtimeMs;
        }
        catch {
            needsSync = true;
        }
        if (!needsSync) {
            return false;
        }
    }
    const content = await promises_1.default.readFile(resolvedSource, 'utf-8');
    await promises_1.default.writeFile(workspacePath, content, 'utf-8');
    console.log('[Mdscape] 已从源文件同步工作副本:', resolvedSource, force ? '(强制)' : '');
    return true;
}
async function readWorkspaceMarkdown(sourcePath, projectPath, workspacePath) {
    const stat = await promises_1.default.stat(workspacePath);
    const content = await promises_1.default.readFile(workspacePath, 'utf-8');
    return {
        path: workspacePath,
        name: path_1.default.basename(workspacePath),
        content,
        lastModified: stat.mtimeMs,
        sourcePath,
        projectPath,
    };
}
