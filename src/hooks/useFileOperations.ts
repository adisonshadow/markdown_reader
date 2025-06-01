import { useState, useCallback, useEffect } from 'react';
import type { MarkdownFile } from '../types';
import { saveFile, getFiles, deleteFile, addToHistory } from '../utils/storage';

export const useFileOperations = () => {
  const [files, setFiles] = useState<MarkdownFile[]>(() => getFiles());

  // 监听 localStorage 变化和自定义事件
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'md_reader_files') {
        const newFiles = e.newValue ? JSON.parse(e.newValue) : [];
        console.log('Storage event received:', newFiles); // 添加日志
        setFiles(newFiles);
      }
    };

    const handleFilesUpdate = (e: CustomEvent<MarkdownFile[]>) => {
      console.log('Files update event received:', e.detail); // 添加日志
      setFiles(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('filesUpdated', handleFilesUpdate as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('filesUpdated', handleFilesUpdate as EventListener);
    };
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const content = await file.text();
      const newFile: MarkdownFile = {
        id: crypto.randomUUID(),
        name: file.name,
        content,
        lastModified: file.lastModified,
      };

      console.log('Uploading new file:', newFile); // 添加日志
      // 保存文件并更新 localStorage
      saveFile(newFile);
      // 添加到历史记录
      addToHistory(newFile);
      // 不需要手动调用 setFiles，因为 saveFile 会触发事件

      return newFile;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }, []);

  const handleFileDelete = useCallback((id: string) => {
    console.log('Deleting file:', id); // 添加日志
    // 删除文件并更新 localStorage
    deleteFile(id);
    // 不需要手动调用 setFiles，因为 deleteFile 会触发事件
  }, []);

  const handleFileUpdate = useCallback((file: MarkdownFile) => {
    console.log('Updating file:', file); // 添加日志
    // 更新文件并更新 localStorage
    saveFile(file);
    // 不需要手动调用 setFiles，因为 saveFile 会触发事件
  }, []);

  return {
    files,
    handleFileUpload,
    handleFileDelete,
    handleFileUpdate,
  };
}; 