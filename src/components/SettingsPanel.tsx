import React, { useState, useEffect } from 'react';
import { Drawer, Form, InputNumber, Button, Space, Divider, message, Row, Col, Select } from 'antd';
import { useSettings } from '../hooks/useSettings';
import type { ReaderSettings } from '../types';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

// 字体粗细选项
const fontWeightOptions = [
  { label: '细', value: 300 },
  { label: '正常', value: 400 },
  { label: '粗', value: 600 },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose }) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [form] = Form.useForm();
  const [isDirty, setIsDirty] = useState(false);

  // 当抽屉打开时，重置表单
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
    // 确保保留所有必需的字段
    const updatedSettings = {
      ...settings,  // 保留现有设置
      ...values,    // 应用新设置
      fontSize: { ...settings.fontSize, ...values.fontSize },
      fontWeight: { ...settings.fontWeight, ...values.fontWeight },
      colors: { ...settings.colors, ...values.colors },
    };
    updateSettings(updatedSettings);
    setIsDirty(false);
    message.success('设置已应用');
  };

  const handleReset = () => {
    resetSettings();
    form.resetFields();
    setIsDirty(false);
    message.success('设置已重置');
  };

  const handleClose = () => {
    if (isDirty) {
      // 如果有未保存的更改，恢复原始设置
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
      width={400}
      maskClosable={false}
      destroyOnClose={false}
      styles={{
        body: {
          paddingBottom: 80,
        },
        header: {
          padding: '16px 24px',
          borderBottom: '1px solid #f0f0f0',
        },
        footer: {
          borderTop: '1px solid #f0f0f0',
          padding: '12px 24px',
        },
      }}
      extra={
        <Space>
          <Button onClick={handleReset}>重置</Button>
          <Button 
            type="primary" 
            onClick={handleApply}
            disabled={!isDirty}
          >
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
        <Divider style={{ margin: '16px 0' }}>字体大小</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="标题 1" name={['fontSize', 'h1']}>
              <InputNumber min={12} max={48} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="标题 2" name={['fontSize', 'h2']}>
              <InputNumber min={12} max={48} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="标题 3" name={['fontSize', 'h3']}>
              <InputNumber min={12} max={48} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="标题 4" name={['fontSize', 'h4']}>
              <InputNumber min={12} max={48} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="标题 5" name={['fontSize', 'h5']}>
              <InputNumber min={12} max={48} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="标题 6" name={['fontSize', 'h6']}>
              <InputNumber min={12} max={48} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="正文" name={['fontSize', 'paragraph']}>
              <InputNumber min={12} max={48} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="代码" name={['fontSize', 'code']}>
              <InputNumber min={12} max={48} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }}>字体粗细</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="标题 1" name={['fontWeight', 'h1']}>
              <Select
                options={fontWeightOptions}
                style={{ width: '100%' }}
                defaultValue={400}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="标题 2" name={['fontWeight', 'h2']}>
              <Select
                options={fontWeightOptions}
                style={{ width: '100%' }}
                defaultValue={400}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="标题 3" name={['fontWeight', 'h3']}>
              <Select
                options={fontWeightOptions}
                style={{ width: '100%' }}
                defaultValue={400}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="标题 4" name={['fontWeight', 'h4']}>
              <Select
                options={fontWeightOptions}
                style={{ width: '100%' }}
                defaultValue={400}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="标题 5" name={['fontWeight', 'h5']}>
              <Select
                options={fontWeightOptions}
                style={{ width: '100%' }}
                defaultValue={400}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="标题 6" name={['fontWeight', 'h6']}>
              <Select
                options={fontWeightOptions}
                style={{ width: '100%' }}
                defaultValue={400}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="正文" name={['fontWeight', 'paragraph']}>
              <Select
                options={fontWeightOptions}
                style={{ width: '100%' }}
                defaultValue={400}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }}>其他设置</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="行高" name="lineHeight">
              <InputNumber min={1} max={3} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}; 