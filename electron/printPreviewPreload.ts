import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('previewAPI', {
  print: () => ipcRenderer.invoke('print-preview:print'),
  close: () => ipcRenderer.invoke('print-preview:close'),
});
