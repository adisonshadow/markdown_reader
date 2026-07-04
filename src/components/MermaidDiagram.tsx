import React, { useEffect, useId, useRef, useState } from 'react';
import { useMermaidRegistry } from '../contexts/MermaidRegistryContext';
import { initMermaid, normalizeMermaidSource, renderMermaidToSvg } from '../utils/mermaidPipeline';

interface MermaidDiagramProps {
  source: string;
  themeBackground: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ source, themeBackground }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const diagramId = `mmd-${reactId.replace(/:/g, '')}`;
  const { register, unregister, restoreGeneration, shouldRestore } = useMermaidRegistry();
  const [error, setError] = useState<string | null>(null);

  const normalizedSource = normalizeMermaidSource(source);

  useEffect(() => {
    register(diagramId, normalizedSource, containerRef.current);
    return () => unregister(diagramId);
  }, [diagramId, normalizedSource, register, unregister]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (container.classList.contains('mermaid-export-image')) {
      return;
    }

    if (!shouldRestore(diagramId) && container.hasAttribute('data-processed')) {
      return;
    }

    let cancelled = false;

    async function renderDiagram() {
      setError(null);
      container!.removeAttribute('data-processed');

      try {
        initMermaid({ background: themeBackground });
        const renderId = `${diagramId}-g${restoreGeneration}`;
        const svg = await renderMermaidToSvg(normalizedSource, renderId, themeBackground);
        if (cancelled) {
          return;
        }
        container!.innerHTML = svg;
        container!.setAttribute('data-processed', 'true');
        register(diagramId, normalizedSource, container);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Mermaid 渲染失败');
          container!.removeAttribute('data-processed');
        }
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [diagramId, normalizedSource, themeBackground, restoreGeneration, register, shouldRestore]);

  const encodedSource = encodeURIComponent(normalizedSource);

  return (
    <div
      ref={containerRef}
      className="mermaid"
      data-diagram-id={diagramId}
      data-source={encodedSource}
      data-mermaid-source={normalizedSource}
    >
      {error && <pre className="mermaid-error">{error}</pre>}
    </div>
  );
};
