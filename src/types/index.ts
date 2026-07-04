export interface MarkdownFile {
  path: string;
  name: string;
  content: string;
  lastModified: number;
  /** 原始 Markdown 文件路径（用于解析相对图片路径） */
  sourcePath?: string;
  /** Mdscape 项目目录 */
  projectPath?: string;
}

export type SettingsMode = 'theme' | 'custom';
export type ThemeId = 'official-doc';

export type TextLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'paragraph';

export interface ElementTypography {
  fontSize: string;
  fontWeight: number;
  fontFamily: string;
  textAlign?: 'left' | 'center' | 'right';
  marginTop?: string;
  marginBottom?: string;
  lineHeight?: number | string;
}

export interface ReaderSettings {
  mode: SettingsMode;
  themeId: ThemeId;
  compactLineHeight: boolean;
  fontSize: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
    paragraph: number;
    code: number;
  };
  fontFamily: {
    h1: string;
    h2: string;
    h3: string;
    h4: string;
    h5: string;
    h6: string;
    paragraph: string;
  };
  colors: {
    text: string;
    background: string;
    link: string;
    code: string;
  };
  fontWeight: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
    paragraph: number;
  };
  lineHeight: number;
}

export interface HistoryRecord {
  path: string;
  name: string;
  lastOpened: number;
}
