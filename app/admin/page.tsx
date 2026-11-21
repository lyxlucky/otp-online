'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ImportOutlined,
  LockFilled,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import ImportModal from './ImportModal';
import BackupModal from './BackupModal';

type Entry = {
  id: string;
  title: string;
  issuer: string | null;
  account: string | null;
  secret: string;
  algorithm: string;
  digits: number;
  period: number;
  sortOrder: number;
  favorite: boolean;
  adminOnly: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormValues = {
  title: string;
  secret?: string;
  issuer?: string;
  account?: string;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: number;
  period?: number;
  sortOrder?: number;
  favorite?: boolean;
  adminOnly?: boolean;
};

export default function AdminPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [backupMode, setBackupMode] = useState<'export' | 'restore'>();
  const [editing, setEditing] = useState<Entry | null>(null);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/entries', { cache: 'no-store' });
      if (!res.ok) throw new Error('加载失败');
      const json = await res.json();
      setEntries(json.data);
    } catch (e) {
      messageApi.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      [e.title, e.issuer, e.account].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [entries, search]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ algorithm: 'SHA1', digits: 6, period: 30, sortOrder: 0, favorite: false, adminOnly: false });
    setModalOpen(true);
  };

  const openEdit = (row: Entry) => {
    setEditing(row);
    form.setFieldsValue({
      title: row.title,
      issuer: row.issuer ?? '',
      account: row.account ?? '',
      algorithm: row.algorithm as FormValues['algorithm'],
      digits: row.digits,
      period: row.period,
      sortOrder: row.sortOrder,
      favorite: row.favorite,
      adminOnly: row.adminOnly,
    });
    setModalOpen(true);
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    const payload: FormValues = { ...values };
    if (!editing && !payload.secret) {
      messageApi.error('请输入 secret');
      return;
    }
    if (editing && !payload.secret) {
      delete payload.secret;
    }

    const url = editing ? `/api/entries/${editing.id}` : '/api/entries';
    const method = editing ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      messageApi.error(err.error === 'invalid_input' ? '输入不合法' : '保存失败');
      return;
    }
    messageApi.success(editing ? '已更新' : '已添加');
    setModalOpen(false);
    await load();
  };

  const onDelete = async (id: string) => {
    const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      messageApi.error('删除失败');
      return;
    }
    messageApi.success('已删除');
    await load();
  };

  const onToggleFavorite = async (row: Entry) => {
    const next = !row.favorite;
    setEntries((cur) => cur.map((e) => (e.id === row.id ? { ...e, favorite: next } : e)));
    const res = await fetch(`/api/entries/${row.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ favorite: next }),
    });
    if (!res.ok) {
      messageApi.error('更新收藏失败');
      setEntries((cur) => cur.map((e) => (e.id === row.id ? { ...e, favorite: !next } : e)));
    }
  };

  return (
    <div>
      {contextHolder}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <Typography.Title level={4} style={{ margin: 0 }}>
          OTP 条目管理
        </Typography.Title>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索标题 / 颁发者 / 账号"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
          <Button icon={<ReloadOutlined />} onClick={load}>
            刷新
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => setBackupMode('export')}>
            导出备份
          </Button>
          <Button onClick={() => setBackupMode('restore')}>
            恢复备份
          </Button>
          <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
            导入
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增
          </Button>
        </Space>
      </div>

      <Table<Entry>
        rowKey="id"
        loading={loading}
        dataSource={filtered}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: '',
            dataIndex: 'favorite',
            width: 50,
            render: (_, row) => (
              <Button
                type="text"
                size="small"
                icon={
                  row.favorite ? (
                    <StarFilled style={{ color: '#facc15' }} />
                  ) : (
                    <StarOutlined style={{ color: '#9ca3af' }} />
                  )
                }
                onClick={() => onToggleFavorite(row)}
              />
            ),
          },
          { title: '标题', dataIndex: 'title', render: (v, row) => (
            <span className="inline-flex items-center gap-1.5">
              {v}
              {row.adminOnly && (
                <LockFilled style={{ color: '#f59e0b', fontSize: 12 }} title="管理员专属" />
              )}
            </span>
          ) },
          { title: '颁发者', dataIndex: 'issuer', render: (v) => v || '—' },
          { title: '账号', dataIndex: 'account', render: (v) => v || '—' },
          { title: '算法', dataIndex: 'algorithm', width: 100 },
          { title: '位数', dataIndex: 'digits', width: 80 },
          { title: '周期(s)', dataIndex: 'period', width: 90 },
          { title: '排序', dataIndex: 'sortOrder', width: 80 },
          {
            title: '操作',
            key: 'actions',
            width: 180,
            render: (_, row) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
                  编辑
                </Button>
                <Popconfirm
                  title="确认删除该条目?"
                  okText="删除"
                  okButtonProps={{ danger: true }}
                  cancelText="取消"
                  onConfirm={() => onDelete(row.id)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        title={editing ? '编辑条目' : '新增条目'}
        onCancel={() => setModalOpen(false)}
        onOk={onSubmit}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form<FormValues> form={form} layout="vertical">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="如:GitHub" />
          </Form.Item>
          <Form.Item
            name="secret"
            label={editing ? 'Secret (留空表示不修改)' : 'Secret'}
            rules={editing ? [] : [{ required: true, message: '请输入 secret' }]}
            extra="Base32 字符串,空格会被自动忽略并转大写"
          >
            <Input.Password placeholder="JBSWY3DPEHPK3PXP" />
          </Form.Item>
          <Form.Item name="issuer" label="颁发者(可选)">
            <Input placeholder="如:GitHub" />
          </Form.Item>
          <Form.Item name="account" label="账号(可选)">
            <Input placeholder="如:mail@example.com" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="algorithm" label="算法" initialValue="SHA1">
              <Select
                options={[
                  { value: 'SHA1', label: 'SHA1' },
                  { value: 'SHA256', label: 'SHA256' },
                  { value: 'SHA512', label: 'SHA512' },
                ]}
              />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序" initialValue={0}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="digits" label="位数" initialValue={6}>
              <InputNumber min={6} max={8} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="period" label="周期(秒)" initialValue={30}>
              <InputNumber min={15} max={120} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="favorite" label="收藏置顶" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item
              name="adminOnly"
              label="管理员专属"
              valuePropName="checked"
              tooltip="开启后此令牌仅登录管理员可见,游客在 /otp 页看不到"
            >
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {backupMode && (
        <BackupModal mode={backupMode}
          onClose={() => {
            setBackupMode(undefined);
            if (backupMode === 'restore') void load();
          }}
          onRestored={(imported, skipped) => {
            messageApi.success(`恢复 ${imported} 条，跳过 ${skipped} 条`);
            setBackupMode(undefined);
            void load();
          }} />
      )}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />
    </div>
  );
}
