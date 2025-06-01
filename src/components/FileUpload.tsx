import React, { useCallback } from 'react';
import { Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { RcCustomRequestOptions } from 'antd/es/upload/interface';
import { useFileOperations } from '../hooks/useFileOperations';
import type { MarkdownFile } from '../types';

interface FileUploadProps {
  onUploadSuccess?: (file: MarkdownFile) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const { handleFileUpload } = useFileOperations();

  const handleUpload = useCallback(async (options: RcCustomRequestOptions) => {
    const { file } = options;
    if (!(file instanceof File)) {
      message.error('无效的文件类型');
      return;
    }

    if (!file.name.endsWith('.md')) {
      message.error('请上传 Markdown 文件');
      return;
    }

    try {
      const newFile = await handleFileUpload(file);
      message.success('文件上传成功');
      onUploadSuccess?.(newFile);
      options.onSuccess?.();
    } catch (error) {
      message.error('文件上传失败');
      console.error(error);
      options.onError?.(error as Error);
    }
  }, [handleFileUpload, onUploadSuccess]);

  return (
    <Upload
      accept=".md"
      showUploadList={false}
      customRequest={handleUpload}
    >
      <Button icon={<UploadOutlined />}>选择 Markdown 文件</Button>
    </Upload>
  );
}; 