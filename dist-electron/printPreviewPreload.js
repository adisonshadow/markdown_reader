"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('previewAPI', {
    print: () => electron_1.ipcRenderer.invoke('print-preview:print'),
    close: () => electron_1.ipcRenderer.invoke('print-preview:close'),
});
