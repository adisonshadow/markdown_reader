import React, { useEffect, useMemo, useState } from 'react';
import { Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import { MermaidDiagram } from './MermaidDiagram';
import { extractImageRefs } from '../utils/markdownAssets';
import { isElectron, resolveLocalAssetUrls } from '../utils/electron';

interface MarkdownRendererProps {
  content: string;
  filePath?: string;
  mermaidBackground?: string;
}

function normalizeCodeSource(children: React.ReactNode): string {
  return String(children).replace(/\n$/, '');
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  filePath,
  mermaidBackground = '#ffffff',
}) => {
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadImages() {
      if (!filePath || !isElectron()) {
        setImageMap({});
        return;
      }

      setLoadingImages(true);
      try {
        const refs = extractImageRefs(content);
        const resolved = refs.length > 0 ? await resolveLocalAssetUrls(filePath, refs) : {};
        if (!cancelled) {
          setImageMap(resolved);
        }
      } catch (error) {
        console.error('图片预解析失败:', error);
        if (!cancelled) {
          setImageMap({});
        }
      } finally {
        if (!cancelled) {
          setLoadingImages(false);
        }
      }
    }

    void loadImages();

    return () => {
      cancelled = true;
    };
  }, [content, filePath]);

  const components = useMemo<Components>(
    () => ({
      img({ src, alt, ...props }) {
        const map = imageMap;
        const resolved =
          src && map[src] ? map[src] : /^(https?:|data:)/i.test(src ?? '') ? src : src ?? '';
        return <img src={resolved} alt={alt ?? ''} {...props} />;
      },
      code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className ?? '');
        const lang = match?.[1];
        const isBlock = Boolean(className?.includes('language-'));

        if (isBlock && lang === 'mermaid') {
          return (
            <MermaidDiagram
              source={normalizeCodeSource(children)}
              themeBackground={mermaidBackground}
            />
          );
        }

        if (isBlock) {
          return (
            <pre className={className}>
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          );
        }

        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
    }),
    [imageMap, mermaidBackground],
  );

  if (loadingImages) {
    return (
      <div className="markdown-body markdown-body--loading">
        <Spin tip="正在加载文档..." />
      </div>
    );
  }

  return (
    <div id="print-root" className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
