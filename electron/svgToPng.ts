import { BrowserWindow, screen } from 'electron';

/** 矢量 SVG 先按倍率放大再截图，避免 capturePage 后再 resize 插值导致模糊 */
const PNG_RENDER_SCALE = 3;
const RENDER_WAIT_MS = 150;

export interface SvgPngResult {
  base64: string;
  displayWidth: number;
  displayHeight: number;
}

/**
 * 用隐藏 Chromium 窗口渲染 SVG 并截图转 PNG。
 * 避免渲染进程 Canvas 污染，也避免 sharp 无法解析 Mermaid foreignObject SVG。
 */
export async function svgStringToPngBase64(svg: string): Promise<SvgPngResult> {
  const displayScaleFactor = screen.getPrimaryDisplay().scaleFactor;
  const renderScale = Math.max(PNG_RENDER_SCALE, Math.ceil(displayScaleFactor));

  const win = new BrowserWindow({
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
          const RENDER_SCALE = ${renderScale};
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
            requestAnimationFrame(() => {
              const box = svgEl.getBoundingClientRect();
              const logicalWidth = Math.max(Math.ceil(box.width), 1);
              const logicalHeight = Math.max(Math.ceil(box.height), 1);
              const scaledWidth = logicalWidth * RENDER_SCALE;
              const scaledHeight = logicalHeight * RENDER_SCALE;

              svgEl.setAttribute('width', String(scaledWidth));
              svgEl.setAttribute('height', String(scaledHeight));
              svgEl.style.width = scaledWidth + 'px';
              svgEl.style.height = scaledHeight + 'px';
              svgEl.style.maxWidth = 'none';
              svgEl.style.maxHeight = 'none';

              requestAnimationFrame(() => {
                const finalBox = svgEl.getBoundingClientRect();
                resolve({
                  width: Math.max(Math.ceil(finalBox.width), scaledWidth),
                  height: Math.max(Math.ceil(finalBox.height), scaledHeight),
                  displayWidth: logicalWidth,
                  displayHeight: logicalHeight,
                });
              });
            });
          });
        } catch (error) {
          reject(error);
        }
      })
    `);

    const padding = 32;
    const contentWidth = Math.min(Math.max(dimensions.width + padding, 100), 8192);
    const contentHeight = Math.min(Math.max(dimensions.height + padding, 100), 8192);

    win.setContentSize(contentWidth, contentHeight);
    await new Promise((resolve) => setTimeout(resolve, RENDER_WAIT_MS));

    const image = await win.webContents.capturePage();
    const pngBuffer = image.toPNG();

    return {
      base64: pngBuffer.toString('base64'),
      displayWidth: dimensions.displayWidth,
      displayHeight: dimensions.displayHeight,
    };
  } finally {
    if (!win.isDestroyed()) {
      win.destroy();
    }
  }
}
