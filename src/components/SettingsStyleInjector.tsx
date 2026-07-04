import { useEffect, useRef } from 'react';
import type { ReaderSettings } from '../types';
import { buildMarkdownTypographyCss } from '../utils/themes';

interface SettingsStyleInjectorProps {
  settings: ReaderSettings;
}

/** 仅更新全局排版样式，不触发 Markdown 内容重渲染 */
export const SettingsStyleInjector: React.FC<SettingsStyleInjectorProps> = ({ settings }) => {
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (styleRef.current) {
      document.head.removeChild(styleRef.current);
    }

    const style = document.createElement('style');
    style.textContent = buildMarkdownTypographyCss(settings);
    document.head.appendChild(style);
    styleRef.current = style;

    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, [settings]);

  return null;
};
