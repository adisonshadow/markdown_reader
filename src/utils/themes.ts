import type { ElementTypography, ReaderSettings, TextLevel, ThemeId } from '../types';

export interface ThemeTemplate {
  id: ThemeId;
  name: string;
  description: string;
  styles: Record<TextLevel, ElementTypography>;
}

/** Word 中文字号 → pt */
export const WORD_FONT_SIZE = {
  erHao: 22,
  sanHao: 16,
  siHao: 14,
  xiaoSi: 12,
} as const;

export const FONT_FAMILY_PRESETS = [
  { label: '黑体', value: 'SimHei, "Microsoft YaHei", "黑体", sans-serif' },
  { label: '宋体', value: 'SimSun, "宋体", serif' },
  { label: '楷体 GB2312', value: 'KaiTi, "楷体_GB2312", "楷体", serif' },
  { label: '仿宋 GB2312', value: 'FangSong, "仿宋_GB2312", "仿宋", serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", "微软雅黑", sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: '系统默认', value: 'system-ui, -apple-system, sans-serif' },
] as const;

export const HEADING_LABELS: Record<TextLevel, string> = {
  h1: '标题 (#)',
  h2: '一级 (##)',
  h3: '二级 (###)',
  h4: '三级 (####)',
  h5: '四级 (#####)',
  h6: '五级 (######)',
  paragraph: '正文',
};

export const themes: ThemeTemplate[] = [
  {
    id: 'official-doc',
    name: '公文格式',
    description:
      '参照 Word 公文排版：标题二号黑体居中；一级三号黑体、二级四号楷体、三级小四宋体加粗、四级小四宋体常规；正文仿宋 GB2312 小四，1.5 倍行距。',
    styles: {
      h1: {
        fontSize: `${WORD_FONT_SIZE.erHao}pt`,
        fontWeight: 700,
        fontFamily: 'SimHei, "Microsoft YaHei", "黑体", sans-serif',
        textAlign: 'center',
        marginTop: '0.5em',
        marginBottom: '0.5em',
        lineHeight: 1.5,
      },
      h2: {
        fontSize: `${WORD_FONT_SIZE.sanHao}pt`,
        fontWeight: 700,
        fontFamily: 'SimHei, "Microsoft YaHei", "黑体", sans-serif',
      },
      h3: {
        fontSize: `${WORD_FONT_SIZE.siHao}pt`,
        fontWeight: 400,
        fontFamily: 'KaiTi, "楷体_GB2312", "楷体", serif',
      },
      h4: {
        fontSize: `${WORD_FONT_SIZE.xiaoSi}pt`,
        fontWeight: 700,
        fontFamily: 'SimSun, "宋体", serif',
      },
      h5: {
        fontSize: `${WORD_FONT_SIZE.xiaoSi}pt`,
        fontWeight: 400,
        fontFamily: 'SimSun, "宋体", serif',
      },
      h6: {
        fontSize: `${WORD_FONT_SIZE.xiaoSi}pt`,
        fontWeight: 400,
        fontFamily: 'SimSun, "宋体", serif',
      },
      paragraph: {
        fontSize: `${WORD_FONT_SIZE.xiaoSi}pt`,
        fontWeight: 400,
        fontFamily: 'FangSong, "仿宋_GB2312", "仿宋", serif',
        lineHeight: 1.5,
      },
    },
  },
];

export function getThemeById(themeId: ThemeId): ThemeTemplate {
  return themes.find((theme) => theme.id === themeId) ?? themes[0];
}

export function resolveTypography(settings: ReaderSettings): Record<TextLevel, ElementTypography> {
  if (settings.mode === 'theme') {
    const theme = getThemeById(settings.themeId);
    const styles = { ...theme.styles };

    if (settings.compactLineHeight) {
      styles.paragraph = {
        ...styles.paragraph,
        lineHeight: '22pt',
      };
    }

    return styles;
  }

  const levels: TextLevel[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'paragraph'];
  return levels.reduce(
    (acc, level) => {
      acc[level] = {
        fontSize: `${settings.fontSize[level]}px`,
        fontWeight: settings.fontWeight[level],
        fontFamily: settings.fontFamily[level],
        lineHeight: level === 'paragraph' ? settings.lineHeight : undefined,
      };
      return acc;
    },
    {} as Record<TextLevel, ElementTypography>,
  );
}

function typographyToCss(selector: string, style: ElementTypography): string {
  const rules: string[] = [
    `font-size: ${style.fontSize}`,
    `font-weight: ${style.fontWeight}`,
    `font-family: ${style.fontFamily}`,
  ];

  if (style.textAlign) {
    rules.push(`text-align: ${style.textAlign}`);
  }
  if (style.marginTop !== undefined) {
    rules.push(`margin-top: ${style.marginTop}`);
  }
  if (style.marginBottom !== undefined) {
    rules.push(`margin-bottom: ${style.marginBottom}`);
  }
  if (style.lineHeight !== undefined) {
    rules.push(`line-height: ${style.lineHeight}`);
  }

  return `${selector} { ${rules.join('; ')}; }`;
}

export function buildMarkdownTypographyCss(settings: ReaderSettings): string {
  const typo = resolveTypography(settings);
  const bodyLineHeight =
    settings.mode === 'theme' && !settings.compactLineHeight
      ? typo.paragraph.lineHeight ?? 1.5
      : settings.mode === 'custom'
        ? settings.lineHeight
        : undefined;

  const headingLevels: Array<Exclude<TextLevel, 'paragraph'>> = [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ];

  const headingCss = headingLevels
    .map((level) => typographyToCss(`.markdown-body ${level}`, typo[level]))
    .join('\n      ');

  const paragraphLineHeight =
    settings.mode === 'theme' && settings.compactLineHeight
      ? '22pt'
      : settings.mode === 'theme'
        ? typo.paragraph.lineHeight ?? 1.5
        : settings.lineHeight;

  const paragraphCss = `
      .markdown-body p,
      .markdown-body li,
      .markdown-body blockquote,
      .markdown-body td,
      .markdown-body th {
        font-size: ${typo.paragraph.fontSize};
        font-weight: ${typo.paragraph.fontWeight};
        font-family: ${typo.paragraph.fontFamily};
        line-height: ${paragraphLineHeight};
      }`;

  const bodyCss = `
      .markdown-body {
        color: ${settings.colors.text};
        background-color: ${settings.colors.background};
        ${bodyLineHeight !== undefined ? `line-height: ${bodyLineHeight};` : ''}
        padding: 40px 24px;
        max-width: 1200px;
        margin: 0 auto;
      }`;

  const codeCss = `
      .markdown-body pre:not(.mermaid) {
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
        font-size: ${settings.fontSize.code}px;
        font-weight: 400;
        line-height: 1.6;
        background-color: ${settings.colors.code};
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;
        overflow: auto;
        white-space: pre;
        word-wrap: normal;
      }
      .markdown-body pre:not(.mermaid) code,
      .markdown-body pre:not(.mermaid) code.hljs {
        display: block;
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        line-height: inherit;
        background: transparent;
        padding: 0;
        border-radius: 0;
        color: inherit;
      }
      .markdown-body :not(pre) > code {
        font-size: ${settings.fontSize.code}px;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
        font-weight: 400;
        line-height: 1.4;
        background-color: ${settings.colors.code};
        padding: 2px 4px;
        border-radius: 4px;
      }`;

  const linkCss = `
      .markdown-body a {
        color: ${settings.colors.link};
        text-decoration: none;
      }
      .markdown-body a:hover {
        text-decoration: underline;
      }`;

  const mermaidCss = `
      .markdown-body .mermaid {
        display: flex;
        justify-content: center;
        margin: 24px 0;
        overflow-x: auto;
      }
      .markdown-body .mermaid svg {
        max-width: 100%;
        height: auto;
      }
      .markdown-body .mermaid img {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 0 auto;
      }
      .markdown-body .mermaid-export-image {
        display: block;
        text-align: center;
        margin: 24px 0;
        white-space: normal;
        font-size: initial;
        line-height: normal;
        background: transparent;
        padding: 0;
      }
      .markdown-body .mermaid-export-img {
        max-width: 100%;
        height: auto;
      }`;

  const printCss = `
      @media print {
        .markdown-body {
          color: #000 !important;
          background: #fff !important;
          padding: 0 !important;
          margin: 0 !important;
          max-width: none !important;
        }
        .markdown-body pre:not(.mermaid) {
          border: 1px solid #ddd !important;
          background-color: #f5f5f5 !important;
          white-space: pre !important;
        }
        .markdown-body pre:not(.mermaid) code {
          background-color: transparent !important;
          padding: 0 !important;
        }
        .markdown-body a {
          color: #000 !important;
          text-decoration: underline !important;
        }
        .markdown-body img {
          max-width: 100% !important;
          height: auto !important;
        }
        .markdown-body .mermaid svg {
          max-width: 100% !important;
        }
      }`;

  return [bodyCss, headingCss, paragraphCss, codeCss, linkCss, mermaidCss, printCss].join('\n      ');
}
