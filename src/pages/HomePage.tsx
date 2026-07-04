import React, { useRef, useState } from 'react';
import { Button, List, Typography, Space, Empty, message } from 'antd';
import { FileMarkdownOutlined, FolderOpenOutlined, DeleteOutlined } from '@ant-design/icons';
import { getHistory, removeFromHistory } from '../utils/storage';
import { isElectron, openFileDialog, openFileByPath, openFileFromBrowser } from '../utils/electron';
import type { MarkdownFile } from '../types';

const { Title, Text } = Typography;

interface HomePageProps {
  onOpenFile: (file: MarkdownFile) => void;
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('zh-CN');
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenFile }) => {
  const [history, setHistory] = useState(() => getHistory());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshHistory = () => {
    setHistory(getHistory());
  };

  const handleOpenDialog = async () => {
    try {
      if (isElectron()) {
        const file = await openFileDialog();
        if (file) {
          onOpenFile(file);
        }
        return;
      }
      fileInputRef.current?.click();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '打开文件失败');
    }
  };

  const handleBrowserFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
      message.error('请选择 Markdown 文件');
      return;
    }

    try {
      const markdownFile = await openFileFromBrowser(file);
      onOpenFile(markdownFile);
    } catch {
      message.error('读取文件失败');
    }
  };

  const handleHistoryClick = async (filePath: string) => {
    try {
      if (isElectron()) {
        const file = await openFileByPath(filePath);
        onOpenFile(file);
        return;
      }
      message.warning('浏览器模式下无法按路径打开，请使用「打开 Markdown 文件」');
    } catch {
      message.error('文件已移动或删除');
      removeFromHistory(filePath);
      refreshHistory();
    }
  };

  const handleRemoveHistory = (filePath: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeFromHistory(filePath);
    refreshHistory();
  };

  return (
    <div className="home-page">
      <div className="home-page__hero">
        <FileMarkdownOutlined className="home-page__icon" />
        <Title level={2} style={{ marginBottom: 8 }}>
          Markdown 阅读器
        </Title>
        <Text type="secondary">打开本地 Markdown 文件，支持公文主题排版、公式与 Mermaid 图表</Text>
        <Space direction="vertical" size="middle" style={{ marginTop: 32 }}>
          <Button
            type="primary"
            size="large"
            icon={<FolderOpenOutlined />}
            onClick={handleOpenDialog}
          >
            打开 Markdown 文件
          </Button>
          {!isElectron() && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              当前为浏览器模式，Electron 桌面版支持历史记录与 PDF 导出
            </Text>
          )}
        </Space>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown"
          style={{ display: 'none' }}
          onChange={handleBrowserFileChange}
        />
      </div>

      <div className="home-page__history">
        <Title level={4}>最近打开</Title>
        {history.length === 0 ? (
          <Empty description="暂无历史记录" />
        ) : (
          <List
            dataSource={history}
            renderItem={(item) => (
              <List.Item
                key={item.path}
                className="history-item"
                onClick={() => handleHistoryClick(item.path)}
                actions={[
                  <Button
                    key="delete"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => handleRemoveHistory(item.path, e)}
                  />,
                ]}
              >
                <List.Item.Meta
                  title={<Text ellipsis>{item.name}</Text>}
                  description={
                    <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                      {item.path} · {formatTime(item.lastOpened)}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
};
