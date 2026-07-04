import React, { useState } from 'react';
import { addToHistory } from './utils/storage';
import { HomePage } from './pages/HomePage';
import { PreviewPage } from './pages/PreviewPage';
import type { MarkdownFile } from './types';
import './App.css';

type AppView = 'home' | 'preview';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  const [currentFile, setCurrentFile] = useState<MarkdownFile | null>(null);
  const [homeKey, setHomeKey] = useState(0);

  const handleOpenFile = (file: MarkdownFile) => {
    addToHistory(file);
    setCurrentFile(file);
    setView('preview');
  };

  const handleBack = () => {
    setView('home');
    setCurrentFile(null);
    setHomeKey((key) => key + 1);
  };

  if (view === 'preview' && currentFile) {
    return (
      <PreviewPage
        file={currentFile}
        onBack={handleBack}
        onFileUpdate={(file, options) => {
          setCurrentFile((prev) => {
            if (!options?.force && prev && prev.content === file.content) {
              return prev;
            }
            return file;
          });
        }}
      />
    );
  }

  return <HomePage key={homeKey} onOpenFile={handleOpenFile} />;
};

export default App;
