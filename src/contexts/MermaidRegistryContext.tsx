import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface MermaidRegistryEntry {
  diagramId: string;
  source: string;
  element: HTMLElement | null;
}

interface MermaidRegistryContextValue {
  register: (diagramId: string, source: string, element: HTMLElement | null) => void;
  unregister: (diagramId: string) => void;
  getEntries: () => MermaidRegistryEntry[];
  restoreGeneration: number;
  requestRestore: (diagramIds?: string[]) => void;
  shouldRestore: (diagramId: string) => boolean;
}

const MermaidRegistryContext = createContext<MermaidRegistryContextValue | null>(null);

export const MermaidRegistryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const entriesRef = useRef(new Map<string, MermaidRegistryEntry>());
  const [restoreGeneration, setRestoreGeneration] = useState(0);
  const pendingRestoreIdsRef = useRef<Set<string> | null>(null);

  const register = useCallback(
    (diagramId: string, source: string, element: HTMLElement | null) => {
      entriesRef.current.set(diagramId, { diagramId, source, element });
    },
    [],
  );

  const unregister = useCallback((diagramId: string) => {
    entriesRef.current.delete(diagramId);
  }, []);

  const getEntries = useCallback(() => Array.from(entriesRef.current.values()), []);

  const requestRestore = useCallback((diagramIds?: string[]) => {
    pendingRestoreIdsRef.current = diagramIds ? new Set(diagramIds) : null;
    setRestoreGeneration((value) => value + 1);
  }, []);

  const shouldRestore = useCallback((diagramId: string) => {
    const pending = pendingRestoreIdsRef.current;
    if (!pending) {
      return true;
    }
    return pending.has(diagramId);
  }, [restoreGeneration]);

  const value = useMemo(
    () => ({
      register,
      unregister,
      getEntries,
      restoreGeneration,
      requestRestore,
      shouldRestore,
    }),
    [register, unregister, getEntries, restoreGeneration, requestRestore, shouldRestore],
  );

  return (
    <MermaidRegistryContext.Provider value={value}>{children}</MermaidRegistryContext.Provider>
  );
};

export function useMermaidRegistry(): MermaidRegistryContextValue {
  const context = useContext(MermaidRegistryContext);
  if (!context) {
    throw new Error('useMermaidRegistry 必须在 MermaidRegistryProvider 内使用');
  }
  return context;
}
