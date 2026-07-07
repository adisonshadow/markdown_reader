import React from 'react';
import { Progress, Spin } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, ExclamationCircleFilled } from '@ant-design/icons';
import type { ExportProgressState } from '../types/export';

interface ExportProgressOverlayProps {
  state: ExportProgressState;
}

function getIcon(phase: ExportProgressState['phase']) {
  if (phase === 'success') {
    return <CheckCircleFilled style={{ color: '#52c41a', fontSize: 20 }} />;
  }
  if (phase === 'error') {
    return <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 20 }} />;
  }
  if (phase === 'canceled') {
    return <ExclamationCircleFilled style={{ color: '#faad14', fontSize: 20 }} />;
  }
  return <Spin size="small" />;
}

export const ExportProgressOverlay: React.FC<ExportProgressOverlayProps> = ({ state }) => {
  if (!state.visible) {
    return null;
  }

  const percent =
    state.total && state.total > 0 && state.current !== undefined
      ? Math.round((state.current / state.total) * 100)
      : undefined;

  const showProgress = state.phase === 'caching' && percent !== undefined;

  return (
    <div className="export-progress-overlay">
      <div className="export-progress-card">
        <div className="export-progress-header">
          {getIcon(state.phase)}
          <span className="export-progress-title">{state.title}</span>
        </div>
        <div className="export-progress-message">{state.message}</div>
        {showProgress && (
          <Progress
            percent={percent}
            size="small"
            status="active"
            format={() => `${state.current}/${state.total}`}
          />
        )}
        {state.phase === 'success' && state.filePath && (
          <div className="export-progress-path" title={state.filePath}>
            {state.filePath}
          </div>
        )}
        {state.phase === 'error' && (
          <div className="export-progress-hint">请打开开发者工具查看 [Export] 详细日志</div>
        )}
      </div>
    </div>
  );
};
