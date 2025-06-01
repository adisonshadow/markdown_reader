import React, { useState, useMemo, useEffect } from 'react';
import { Layout, Button, Typography, Space, List, Popconfirm, message } from 'antd';
import { SettingOutlined, DeleteOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { FileUpload } from './components/FileUpload';
import { SettingsPanel } from './components/SettingsPanel';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { useFileOperations } from './hooks/useFileOperations';
import { useSettings } from './hooks/useSettings';
import { getHistory } from './utils/storage';
import type { MarkdownFile } from './types';
import './App.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

interface FileListItem extends MarkdownFile {
  lastOpened?: number;
}

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<MarkdownFile | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { files, handleFileDelete: deleteFile } = useFileOperations();
  const { settings } = useSettings();
  const history = getHistory();
  const [messageApi, contextHolder] = message.useMessage();

  // 合并文件列表和历史记录
  const fileList = useMemo(() => {
    const historyMap = new Map<string, number>();
    history.forEach(record => {
      historyMap.set(record.id, record.lastOpened);
    });

    return files.map(file => ({
      ...file,
      lastOpened: historyMap.get(file.id),
    })).sort((a, b) => {
      // 优先按最后打开时间排序，其次按文件名排序
      if (a.lastOpened && b.lastOpened) {
        return b.lastOpened - a.lastOpened;
      }
      if (a.lastOpened) return -1;
      if (b.lastOpened) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [files, history]);

  const handleFileSelect = (file: MarkdownFile) => {
    setSelectedFile(file);
  };

  const handleUploadSuccess = (file: MarkdownFile) => {
    setSelectedFile(file);
  };

  const handleDeleteClick = (file: MarkdownFile, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发文件选择
    if (selectedFile?.id === file.id) {
      setSelectedFile(null);
    }
    deleteFile(file.id);
  };

  // 监听 ESC 键
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  // 处理全屏切换
  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    if (newFullscreenState) {
      messageApi.info('按 ESC 键即可退出全屏预览');
    }
  };

  return (
    <>
      {contextHolder}
      <Layout style={{ minHeight: '100vh', width: '100%', position: 'relative' }}>
        <Header style={{ 
          display: isFullscreen ? 'none' : 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          background: '#001529',
        }}>
          <Title level={3} style={{ margin: 0, color: '#fff' }}>Markdown 阅读器</Title>
          <Space>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
            <Button 
              icon={<SettingOutlined />} 
              onClick={() => setSettingsVisible(true)}
              type="primary"
            >
              设置
            </Button>
            {selectedFile && (
              <Button
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={toggleFullscreen}
                type="primary"
              >
                {isFullscreen ? '退出全页' : '全页预览'}
              </Button>
            )}
          </Space>
        </Header>
        <Layout style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 64px)', position: 'relative' }}>
          <Sider 
            width={300} 
            theme="light"
            style={{
              display: isFullscreen ? 'none' : 'block',
              overflow: 'auto',
              height: '100%',
              position: 'sticky',
              left: 0,
              top: 64,
              borderRight: '1px solid #f0f0f0',
            }}
          >
            <div style={{ padding: '16px' }}>
              <Title level={5} style={{ marginBottom: '16px' }}>文件列表</Title>
              <List
                dataSource={fileList}
                renderItem={(file: FileListItem) => (
                  <List.Item
                    key={file.id}
                    onClick={() => handleFileSelect(file)}
                    className={`file-list-item ${selectedFile?.id === file.id ? 'selected' : ''}`}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text ellipsis>{file.name}</Text>
                    </div>
                    <Popconfirm
                      title="删除文件"
                      description="确定要删除这个文件吗？"
                      onConfirm={(e) => handleDeleteClick(file, e as React.MouseEvent)}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="确定"
                      cancelText="取消"
                    >
                      <div
                        className="delete-button"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          backgroundColor: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <DeleteOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} />
                      </div>
                    </Popconfirm>
                  </List.Item>
                )}
              />
            </div>
          </Sider>
          <Content style={{ 
            padding: isFullscreen ? '0' : '24px', 
            backgroundColor: '#fff',
          }}>
            {selectedFile ? (
              <MarkdownRenderer 
                content={selectedFile.content} 
                settings={settings}
                isFullscreen={isFullscreen}
              />
            ) : (
              <div style={{ 
                display: isFullscreen ? 'none' : 'block',
                textAlign: 'center', 
                marginTop: '20%' 
              }}>
                <Title level={4}>请选择或上传一个 Markdown 文件</Title>
              </div>
            )}
          </Content>
        </Layout>
        <SettingsPanel 
          open={settingsVisible}
          onClose={() => setSettingsVisible(false)}
        />
      </Layout>
    </>
  );
};

export default App;
