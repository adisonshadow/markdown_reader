"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadProjectSettings = loadProjectSettings;
exports.saveProjectSettings = saveProjectSettings;
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const mdscapeProject_1 = require("./mdscapeProject");
async function loadProjectSettings(projectPath) {
    const settingsPath = path_1.default.join(projectPath, mdscapeProject_1.MDSCAPE_SETTINGS_FILE);
    try {
        await promises_1.default.access(settingsPath, fs_1.constants.R_OK);
        return JSON.parse(await promises_1.default.readFile(settingsPath, 'utf-8'));
    }
    catch {
        return null;
    }
}
async function saveProjectSettings(projectPath, settings) {
    const settingsPath = path_1.default.join(projectPath, mdscapeProject_1.MDSCAPE_SETTINGS_FILE);
    await promises_1.default.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    console.log('[Mdscape] 已保存设置:', settingsPath);
}
