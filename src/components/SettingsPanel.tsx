import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Form,
  InputNumber,
  Button,
  Space,
  Divider,
  message,
  Row,
  Col,
  Select,
  Segmented,
  Checkbox,
  Typography,
  Collapse,
} from 'antd';
import { useSettingsContext } from '../contexts/SettingsContext';
import { defaultSettings } from '../utils/storage';
import type { ReaderSettings, TextLevel } from '../types';
import {
  FONT_FAMILY_PRESETS,
  HEADING_LABELS,
  themes,
} from '../utils/themes';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const fontWeightOptions = [
  { label: '细', value: 300 },
  { label: '正常', value: 400 },
  { label: '粗', value: 600 },
  { label: '加粗', value: 700 },
];

const customLevels: TextLevel[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'paragraph'];

const LevelStyleFields: React.FC<{ level: TextLevel }> = ({ level }) => (
  <Row gutter={[12, 0]}>
    <Col span={24}>
      <Form.Item label="字体" name={['fontFamily', level]}>
        <Select options={[...FONT_FAMILY_PRESETS]} style={{ width: '100%' }} />
      </Form.Item>
    </Col>
    <Col span={12}>
      <Form.Item label="字号 (px)" name={['fontSize', level]}>
        <InputNumber min={10} max={72} style={{ width: '100%' }} />
      </Form.Item>
    </Col>
    <Col span={12}>
      <Form.Item label="粗细" name={['fontWeight', level]}>
        <Select options={fontWeightOptions} style={{ width: '100%' }} />
      </Form.Item>
    </Col>
  </Row>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose }) => {
  const { settings, updateSettings, resetSettings } = useSettingsContext();
  const [form] = Form.useForm();
  const [isDirty, setIsDirty] = useState(false);
  const mode = Form.useWatch('mode', form) ?? settings.mode;
  const selectedThemeId = Form.useWatch('themeId', form) ?? settings.themeId;
  const selectedTheme = themes.find((theme) => theme.id === selectedThemeId) ?? themes[0];

  useEffect(() => {
    if (open) {
      form.setFieldsValue(settings);
      setIsDirty(false);
    }
  }, [open, settings, form]);

  const handleValuesChange = () => {
    setIsDirty(true);
  };

  const handleApply = () => {
    const values = form.getFieldsValue() as ReaderSettings;
    updateSettings({
      ...settings,
      ...values,
      fontSize: { ...settings.fontSize, ...values.fontSize },
      fontFamily: { ...settings.fontFamily, ...values.fontFamily },
      fontWeight: { ...settings.fontWeight, ...values.fontWeight },
      colors: { ...settings.colors, ...values.colors },
    });
    setIsDirty(false);
    message.success('设置已应用');
  };

  const handleReset = () => {
    resetSettings();
    form.setFieldsValue(defaultSettings);
    setIsDirty(false);
    message.success('设置已重置');
  };

  const handleClose = () => {
    if (isDirty) {
      form.setFieldsValue(settings);
    }
    onClose();
  };

  return (
    <Drawer
      title="阅读设置"
      placement="right"
      onClose={handleClose}
      open={open}
      width={480}
      maskClosable={false}
      destroyOnClose={false}
      styles={{
        body: { paddingBottom: 80 },
        header: { padding: '16px 24px', borderBottom: '1px solid #f0f0f0' },
        footer: { borderTop: '1px solid #f0f0f0', padding: '12px 24px' },
      }}
      extra={
        <Space>
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={handleApply} disabled={!isDirty}>
            应用
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={settings}
        onValuesChange={handleValuesChange}
        style={{ padding: '0 8px' }}
      >
        <Form.Item label="排版方式" name="mode">
          <Segmented
            block
            options={[
              { label: '主题', value: 'theme' },
              { label: '自定义', value: 'custom' },
            ]}
          />
        </Form.Item>

        {mode === 'theme' && (
          <>
            <Divider style={{ margin: '16px 0' }}>主题选择</Divider>
            <Form.Item label="主题模板" name="themeId">
              <Select
                options={themes.map((theme) => ({
                  label: theme.name,
                  value: theme.id,
                }))}
              />
            </Form.Item>
            <Typography.Paragraph type="secondary" style={{ marginTop: -8, fontSize: 13 }}>
              {selectedTheme.description}
            </Typography.Paragraph>
            <Form.Item name="compactLineHeight" valuePropName="checked">
              <Checkbox>紧凑行距（正文固定 22 磅，适用于数据密集、多表格文档）</Checkbox>
            </Form.Item>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: -12 }}>
              主题规范：标题 # 二号黑体居中；一级 ## 三号黑体；二级 ### 四号楷体；三级 #### 小四宋体加粗；四级 ##### 小四宋体常规；正文仿宋 GB2312 小四，1.5 倍行距。
            </Typography.Text>
          </>
        )}

        {mode === 'custom' && (
          <>
            <Divider style={{ margin: '16px 0' }}>自定义排版</Divider>
            <Collapse
              bordered={false}
              defaultActiveKey={['h1', 'paragraph']}
              items={customLevels.map((level) => ({
                key: level,
                label: HEADING_LABELS[level],
                children: <LevelStyleFields level={level} />,
              }))}
            />
            <Divider style={{ margin: '16px 0' }}>页面样式</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="正文行高（倍数）" name="lineHeight">
                  <InputNumber min={1} max={3} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="文字颜色" name={['colors', 'text']}>
                  <input type="color" style={{ width: '100%', height: 32, padding: 0, border: 'none' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="背景颜色" name={['colors', 'background']}>
                  <input type="color" style={{ width: '100%', height: 32, padding: 0, border: 'none' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="链接颜色" name={['colors', 'link']}>
                  <input type="color" style={{ width: '100%', height: 32, padding: 0, border: 'none' }} />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {mode === 'theme' && (
          <>
            <Divider style={{ margin: '16px 0' }}>页面颜色</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="文字颜色" name={['colors', 'text']}>
                  <input type="color" style={{ width: '100%', height: 32, padding: 0, border: 'none' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="背景颜色" name={['colors', 'background']}>
                  <input type="color" style={{ width: '100%', height: 32, padding: 0, border: 'none' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="链接颜色" name={['colors', 'link']}>
                  <input type="color" style={{ width: '100%', height: 32, padding: 0, border: 'none' }} />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        <Divider style={{ margin: '16px 0' }}>代码样式（独立，不受主题影响）</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="代码字号 (px)" name={['fontSize', 'code']}>
              <InputNumber min={10} max={32} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="代码背景色" name={['colors', 'code']}>
              <input type="color" style={{ width: '100%', height: 32, padding: 0, border: 'none' }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
};
