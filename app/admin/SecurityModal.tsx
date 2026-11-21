'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Divider, Form, Input, List, Modal, Popconfirm, Space } from 'antd';
import { browserSupportsWebAuthn, startRegistration } from '@otp-online/webauthn-browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@otp-online/webauthn-server';

type SecurityStatus = {
  passkeys: { id: string; label: string; rpId: string; createdAt: string }[];
  remainingCodes: number;
};

const errors: Record<string, string> = {
  invalid_origin: '请从设置 Passkey 的 HTTPS 域名或 localhost 打开此页面',
  invalid_password: '管理员密码不正确',
  invalid_challenge: '验证请求已过期，请重新添加 Passkey',
  invalid_passkey: '无法验证 Passkey，请重新尝试',
  existing_passkey: '此 Passkey 已绑定',
};

async function requestSecurity<T>(body?: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/security', {
    cache: 'no-store',
    ...(body && {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(errors[data?.error] ?? '无法更新安全设置，请重试');
  return data;
}

export default function SecurityModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<SecurityStatus>();
  const [password, setPassword] = useState('');
  const [label, setLabel] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => setStatus(await requestSecurity<SecurityStatus>());
  useEffect(() => {
    void load().catch(() => setError('无法加载安全设置，请确认数据库迁移已完成'));
  }, []);

  async function run(task: () => Promise<void>) {
    setError('');
    setNotice('');
    if (!password) {
      setError('请输入当前管理员密码');
      return;
    }
    setBusy(true);
    try {
      await task();
      setPassword('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法更新安全设置');
    } finally {
      setBusy(false);
    }
  }

  const addPasskey = () => run(async () => {
    if (!browserSupportsWebAuthn()) throw new Error('此浏览器或站点地址不支持 Passkey');
    const name = label.trim();
    if (!name) throw new Error('请输入设备名称');
    const optionsJSON = await requestSecurity<PublicKeyCredentialCreationOptionsJSON>({
      action: 'register-options', password,
    });
    const response = await startRegistration({ optionsJSON }).catch(() => {
      throw new Error('未完成设备验证，请重试');
    });
    await requestSecurity({ action: 'register', label: name, response });
    setLabel('');
    setNotice('Passkey 已添加');
  });

  return (
    <Modal open title="账户安全" footer={null} onCancel={onClose}
      closable={!busy} keyboard={!busy} maskClosable={false}>
      {error && <Alert type="error" showIcon message={error} className="mb-4" />}
      {notice && <Alert type="success" showIcon message={notice} className="mb-4" />}
      <Form layout="vertical" disabled={busy} autoComplete="off">
        <Form.Item label="当前管理员密码" htmlFor="security-password"
          extra="添加或移除 Passkey、生成恢复码时需要验证密码。">
          <Input.Password id="security-password" autoComplete="current-password" maxLength={128}
            value={password} onChange={(event) => setPassword(event.target.value)} />
        </Form.Item>
        <h3 className="mb-2 font-semibold">Passkey</h3>
        <Form.Item label="设备名称" htmlFor="passkey-label">
          <Input id="passkey-label" maxLength={80} value={label} placeholder="例如 我的笔记本"
            onChange={(event) => setLabel(event.target.value)} />
        </Form.Item>
        <Button onClick={() => void addPasskey()} loading={busy}>添加 Passkey</Button>
        {status && (
          <List className="mt-3" size="small" dataSource={status.passkeys}
            locale={{ emptyText: '尚未绑定 Passkey' }}
            renderItem={(key) => <List.Item key={key.id} actions={[
              <Popconfirm key="remove" title="移除此 Passkey？" okText="移除" cancelText="取消"
                onConfirm={() => void run(async () => {
                  await requestSecurity({ action: 'remove-passkey', id: key.id, password });
                  setNotice('Passkey 已移除');
                })}>
                <Button type="link" danger aria-label={`移除 ${key.label}`}>移除</Button>
              </Popconfirm>,
            ]}>
              <div className="min-w-0 break-words">
                <div>{key.label}</div>
                <div className="text-xs text-gray-600">{key.rpId}</div>
              </div>
            </List.Item>} />
        )}
        <Divider />
        <h3 className="mb-2 font-semibold">恢复码</h3>
        {status && <p>剩余 {status.remainingCodes} 个。每个恢复码可登录一次。</p>}
        <Space wrap className="mt-2">
          <Popconfirm title="生成一组新的恢复码？" description="之前的恢复码会立即失效。"
            okText="生成" cancelText="取消" onConfirm={() => void run(async () => {
              const result = await requestSecurity<{ codes: string[] }>({
                action: 'replace-recovery-codes', password,
              });
              setCodes(result.codes);
            })}>
            <Button loading={busy}>生成恢复码</Button>
          </Popconfirm>
          {codes.length > 0 && <Button onClick={() => {
            void navigator.clipboard.writeText(codes.join('\n')).then(
              () => setNotice('已复制恢复码'),
              () => setError('无法访问剪贴板，请手动复制'),
            );
          }}>复制全部</Button>}
        </Space>
        {codes.length > 0 && <>
          <Alert className="my-3" type="warning" showIcon
            message="恢复码只显示这一次，请保存在安全的位置。" />
          <ul className="rounded bg-gray-50 p-3 font-mono text-sm">
            {codes.map((code) => <li className="break-all" key={code}>{code}</li>)}
          </ul>
        </>}
      </Form>
    </Modal>
  );
}
