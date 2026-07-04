"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.svgStringToPngBase64 = svgStringToPngBase64;
const electron_1 = require("electron");
/**
 * 用隐藏 Chromium 窗口渲染 SVG 并截图转 PNG。
 * 避免渲染进程 Canvas 污染，也避免 sharp 无法解析 Mermaid foreignObject SVG。
 */
async function svgStringToPngBase64(svg) {
    const win = new electron_1.BrowserWindow({
        show: false,
        width: 800,
        height: 600,
        webPreferences: {
            offscreen: true,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });
    try {
        await win.loadURL('about:blank');
        const dimensions = await win.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        try {
          document.documentElement.style.background = '#ffffff';
          document.body.style.margin = '0';
          document.body.style.padding = '16px';
          document.body.style.background = '#ffffff';
          document.body.style.display = 'inline-block';

          const wrapper = document.createElement('div');
          wrapper.innerHTML = ${JSON.stringify(svg)};
          const svgEl = wrapper.querySelector('svg');
          if (!svgEl) {
            reject(new Error('SVG 元素未找到'));
            return;
          }
          document.body.appendChild(svgEl);

          requestAnimationFrame(() => {
            const box = svgEl.getBoundingClientRect();
            const width = Math.ceil(box.width) || 800;
            const height = Math.ceil(box.height) || 600;
            resolve({ width, height });
          });
        } catch (error) {
          reject(error);
        }
      })
    `);
        const padding = 32;
        const contentWidth = Math.min(Math.max(dimensions.width + padding, 100), 4096);
        const contentHeight = Math.min(Math.max(dimensions.height + padding, 100), 4096);
        win.setContentSize(contentWidth, contentHeight);
        await new Promise((resolve) => setTimeout(resolve, 80));
        const image = await win.webContents.capturePage();
        const scale = 2;
        const size = image.getSize();
        const targetWidth = Math.min(size.width * scale, 8192);
        const targetHeight = Math.min(size.height * scale, 8192);
        const pngBuffer = targetWidth > size.width
            ? image.resize({ width: targetWidth, height: targetHeight }).toPNG()
            : image.toPNG();
        return pngBuffer.toString('base64');
    }
    finally {
        if (!win.isDestroyed()) {
            win.destroy();
        }
    }
}
