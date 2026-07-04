"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMermaidCachePath = getMermaidCachePath;
exports.getMermaidCacheDataUrl = getMermaidCacheDataUrl;
exports.saveMermaidCache = saveMermaidCache;
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const mdscapeProject_1 = require("./mdscapeProject");
function getMermaidCachePath(projectPath, hash) {
    return path_1.default.join((0, mdscapeProject_1.getMermaidCacheDir)(projectPath), `${hash}.png`);
}
async function getMermaidCacheDataUrl(projectPath, hash) {
    const filePath = getMermaidCachePath(projectPath, hash);
    try {
        await promises_1.default.access(filePath, fs_1.constants.R_OK);
        const buffer = await promises_1.default.readFile(filePath);
        console.log('[MermaidCache] 命中缓存:', filePath);
        return `data:image/png;base64,${buffer.toString('base64')}`;
    }
    catch {
        return null;
    }
}
async function saveMermaidCache(projectPath, hash, pngBase64) {
    const dir = (0, mdscapeProject_1.getMermaidCacheDir)(projectPath);
    await promises_1.default.mkdir(dir, { recursive: true });
    const filePath = getMermaidCachePath(projectPath, hash);
    await promises_1.default.writeFile(filePath, Buffer.from(pngBase64, 'base64'));
    console.log('[MermaidCache] 已写入缓存:', filePath);
    return filePath;
}
