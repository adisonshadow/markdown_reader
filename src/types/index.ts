export interface MarkdownFile {
  id: string;
  name: string;
  content: string;
  lastModified: number;
  path?: string;
}

export interface ReaderSettings {
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
  id: string;
  name: string;
  lastOpened: number;
  path?: string;
} 