export type ExportProgressPhase =
  | 'idle'
  | 'waiting'
  | 'caching'
  | 'embedding'
  | 'building'
  | 'dialog'
  | 'saving'
  | 'success'
  | 'error'
  | 'canceled';

export interface ExportProgressState {
  visible: boolean;
  phase: ExportProgressPhase;
  title: string;
  message: string;
  current?: number;
  total?: number;
  filePath?: string;
}

export const initialExportProgress: ExportProgressState = {
  visible: false,
  phase: 'idle',
  title: '',
  message: '',
};

export interface ExportProgressUpdate {
  phase: ExportProgressPhase;
  title?: string;
  message: string;
  current?: number;
  total?: number;
  filePath?: string;
}

export type ExportProgressCallback = (update: ExportProgressUpdate) => void;

export interface MermaidPrepareProgress {
  current: number;
  total: number;
  cached: boolean;
}

export type MermaidPrepareProgressCallback = (progress: MermaidPrepareProgress) => void;
