# MDScape — Markdown 预览 + 打印 + 导出

面向「预览 + 打印 + 导出」的 Markdown 桌面应用，出发点是：我发现使用AI Agent生成的技术文档、产品文档都是Markdown格式的，如果需要打印或导出PDF、Word，其效果很差，所有拿AI再造个轮子。虽然是 Vibe Coding 的，但是花的是我的心思，烧的我的Token，方便的是大家。

这个应用我自己常用，会慢慢修缮里面的问题，现在只是勉强能用，需要的自己下下来，自己Build。

## 功能特点

### 阅读与预览

- 打开本地 `.md` / `.markdown` 文件（Electron 桌面版）
- **react-markdown** 渲染，支持 GFM（表格、任务列表等）
- KaTeX 数学公式、highlight.js 代码高亮
- Mermaid 流程图 / 时序图（React 组件渲染，预览稳定）
- 本地相对路径图片自动解析为 data URL

### 样式与主题

- **公文格式**主题（参照 Word 公文排版：黑体标题、楷体/宋体层级、仿宋正文等）
- 自定义模式：各级标题/正文字号、字体、颜色、行距
- 样式按 **mdscape 项目** 保存，每个文档独立配置
- 仅支持浅色界面（不跟随系统 Dark 模式）

### 导出

- **导出 PDF**（Electron）：直接 `printToPDF`，Mermaid 保留页内 SVG 矢量图
- **导出 DOCX**（Electron）：Mermaid 转为 PNG 嵌入；图表缓存于项目目录
- **打印**：浏览器打印对话框，打印前等待 Mermaid 渲染完成

### 文件与项目

- 打开源文件时自动创建 `{文件名}_mdscape/` 项目目录，包含：
  - 工作副本 Markdown
  - `settings.json`（阅读设置）
  - `mermaid-image-cache/`（DOCX 导出用图表缓存）
  - `meta.json`（源文件路径等元数据）
- 源文件变更时自动同步预览（Electron 文件监听）
- 点击预览页 **header 文件名** 可强制从原始文件刷新

### 其他

- 最近打开记录（localStorage）
- 导出进度浮层（PDF/DOCX）

## 环境要求

- Node.js 18+（推荐）
- Yarn 或 npm

## 安装与运行

```bash
# 克隆后进入项目目录
yarn install

# 开发（Vite 构建 + Electron）
yarn dev

# 仅构建渲染进程
yarn build:renderer

# 完整构建
yarn build

# 运行已构建的桌面版
yarn start

# 打包安装包
yarn pack
```

开发时 Vite 默认端口为 **7531**（见 `vite.config.ts`）。

## 使用说明

### 打开文件

1. 启动桌面应用，点击「打开 Markdown 文件」
2. 选择 `.md` 文件；同目录下会自动维护 `_mdscape` 项目文件夹
3. 从历史记录可快速重新打开

### 预览页操作

| 操作 | 说明 |
|------|------|
| 设置 | 调整公文/自定义排版，保存到当前项目 |
| 打印 | 系统打印对话框 |
| 导出 PDF | 选择保存路径，生成 PDF |
| 导出 DOCX | 生成 Word 文档（Mermaid 为图片） |
| 点击文件名 | 强制从磁盘上的原始 `.md` 同步最新内容 |

### 在外部编辑器中改稿

在 VS Code 等工具中编辑**源文件**并保存后，预览应自动更新。若未更新，点击 header 文件名手动同步。

## 项目结构（简要）

```
src/
  components/     MarkdownRenderer、MermaidDiagram、SettingsPanel 等
  pages/          HomePage、PreviewPage
  utils/          导出、主题、Electron 封装
electron/         主进程：文件、mdscape 项目、PDF、Mermaid PNG 转换
```

## 技术栈

- React 19 + TypeScript + Vite
- Electron
- Ant Design 5
- react-markdown、remark-gfm、remark-math、rehype-katex、rehype-highlight
- Mermaid、KaTeX、highlight.js
- html-to-docx（DOCX 导出）

## 常见问题

**导出功能不可用？**  
PDF/DOCX 导出仅在 Electron 桌面版可用，浏览器模式不支持。

**Mermaid 在 PDF 与 DOCX 中表现不同？**  
PDF 直接使用页面 SVG；DOCX 需转为 PNG 嵌入，首次导出会在项目目录生成缓存。

**预览内容与磁盘不一致？**  
点击预览页文件名强制同步；确认修改的是源 `.md`，而非 `_mdscape` 内的工作副本。

**数学公式不显示？**  
行内公式 `$...$`，块级公式 `$$...$$`。

## 许可证

MIT License
