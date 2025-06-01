import React, { useEffect, useMemo, useRef } from 'react';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import katex from 'katex';
import type { MarkedOptions, Tokens } from 'marked';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import type { ReaderSettings } from '../types';

interface MarkdownRendererProps {
  content: string;
  settings: ReaderSettings;
  isFullscreen?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  settings,
  isFullscreen = false 
}) => {
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // 配置 marked 使用 highlight.js
  marked.use(markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code: string, lang: string) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  }));

  // 配置 marked 使用 KaTeX
  const renderer = new marked.Renderer();
  const originalCodeRenderer = renderer.code.bind(renderer);

  renderer.code = (code: Tokens.Code) => {
    if (code.lang === 'math') {
      try {
        return katex.renderToString(code.text, {
          displayMode: true,
          throwOnError: false,
        });
      } catch (e) {
        console.error('KaTeX rendering error:', e);
        return code.text;
      }
    }
    return originalCodeRenderer(code);
  };

  // 处理行内数学公式
  const processInlineMath = (text: string) => {
    return text.replace(/\$([^$]+)\$/g, (_, math) => {
      try {
        return katex.renderToString(math, {
          displayMode: false,
          throwOnError: false,
        });
      } catch (e) {
        console.error('KaTeX inline rendering error:', e);
        return math;
      }
    });
  };

  const html = useMemo(() => {
    const processedContent = processInlineMath(content);
    const options: MarkedOptions = { renderer };
    return marked(processedContent, options);
  }, [content, renderer]);

  // 应用样式
  useEffect(() => {
    // 移除旧的样式元素
    if (styleRef.current) {
      document.head.removeChild(styleRef.current);
    }

    // 创建新的样式元素
    const style = document.createElement('style');
    style.textContent = `
      .markdown-body {
        color: ${settings.colors.text};
        background-color: ${settings.colors.background};
        line-height: ${settings.lineHeight};
        padding: ${isFullscreen ? '40px' : '20px'};
        max-width: ${isFullscreen ? '100%' : '1200px'};
        margin: 0 auto;
      }

      /* 打印样式 */
      @media print {
        .markdown-body {
          color: #000 !important;
          background: #fff !important;
          padding: 0 !important;
          margin: 0 !important;
          max-width: none !important;
        }

        /* 调整代码块样式 */
        .markdown-body pre {
          border: 1px solid #ddd !important;
          background-color: #f5f5f5 !important;
          white-space: pre-wrap !important;
        }

        .markdown-body code {
          background-color: #f5f5f5 !important;
        }

        /* 调整链接样式 */
        .markdown-body a {
          color: #000 !important;
          text-decoration: underline !important;
        }

        /* 确保图片不会超出页面 */
        .markdown-body img {
          max-width: 100% !important;
          height: auto !important;
        }
      }

      .markdown-body h1 { font-size: ${settings.fontSize.h1}px; font-weight: ${settings.fontWeight.h1}; }
      .markdown-body h2 { font-size: ${settings.fontSize.h2}px; font-weight: ${settings.fontWeight.h2}; }
      .markdown-body h3 { font-size: ${settings.fontSize.h3}px; font-weight: ${settings.fontWeight.h3}; }
      .markdown-body h4 { font-size: ${settings.fontSize.h4}px; font-weight: ${settings.fontWeight.h4}; }
      .markdown-body h5 { font-size: ${settings.fontSize.h5}px; font-weight: ${settings.fontWeight.h5}; }
      .markdown-body h6 { font-size: ${settings.fontSize.h6}px; font-weight: ${settings.fontWeight.h6}; }
      .markdown-body p { font-size: ${settings.fontSize.paragraph}px; font-weight: ${settings.fontWeight.paragraph}; }
      .markdown-body code { 
        font-size: ${settings.fontSize.code}px; 
        background-color: ${settings.colors.code};
        padding: 2px 4px;
        border-radius: 4px;
      }
      .markdown-body pre code {
        padding: 16px;
        border-radius: 8px;
      }
      .markdown-body a { 
        color: ${settings.colors.link};
        text-decoration: none;
      }
      .markdown-body a:hover {
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);
    styleRef.current = style;

    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, [settings, isFullscreen]);

  return (
    <div 
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}; 