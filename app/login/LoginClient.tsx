'use client';

import React, { useState } from 'react';
import { Alert, Button, Card, Form, Input, Segmented } from 'antd';
import { KeyOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { browserSupportsWebAuthn, startAuthentication } from '@otp-online/webauthn-browser';

type FormValues = { username: string; password?: string; code?: string };
type Method = 'password' | 'recovery';

export default function LoginClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/otp';
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<Method>('password');
  const [error, setError] = useState('');

  async function login(authenticate: () => Promise<void>) {
    setError('');
    setLoading(true);
    try {
      await authenticate();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '暂时无法登录，请重试');
    } finally {
      setLoading(false);
    }
  }

  async function authenticate(provider: string, fields: Record<string, string>, failure: string) {
    const result = await signIn(provider, { ...fields, redirectTo: callbackUrl, redirect: false });
    if (!result?.ok || result.error) throw new Error(failure);

    const target = new URL(result.url || '/otp', window.location.origin);
    window.location.assign(target.origin === window.location.origin ? target.href : '/otp');
  }

  const onFinish = (values: FormValues) => login(() => method === 'recovery'
    ? authenticate('recovery-code', { username: values.username, code: values.code ?? '' },
      '用户名或恢复码不正确，或此恢复码已使用')
    : authenticate('credentials', { username: values.username, password: values.password ?? '' },
      '用户名或密码错误'));

  const usePasskey = () => login(async () => {
    if (!browserSupportsWebAuthn()) throw new Error('此浏览器或站点地址不支持 Passkey');
    const response = await fetch('/api/passkeys', { method: 'POST', cache: 'no-store' });
    if (!response.ok) throw new Error('无法开始 Passkey 登录，请确认使用已绑定的站点地址');
    const optionsJSON = await response.json();
    const assertion = await startAuthentication({ optionsJSON }).catch(() => {
      throw new Error('未完成设备验证，请重试');
    });
    await authenticate('passkey', { assertion: JSON.stringify(assertion) }, 'Passkey 登录失败，请重试');
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
      <Card className="w-full max-w-sm shadow-lg" title="OTP 管理系统 · 登录" bordered={false}>
        {error && <Alert type="error" showIcon message={error} className="mb-4" />}
        <Button block className="mb-4" onClick={() => void usePasskey()} disabled={loading}
          icon={<KeyOutlined />} size="large">使用 Passkey 登录</Button>
        <Segmented<Method> block value={method} disabled={loading}
          className="mb-4" options={[{ label: '密码', value: 'password' }, { label: '恢复码', value: 'recovery' }]}
          onChange={(selected) => { setMethod(selected); setError(''); }} />
        <Form<FormValues>
          name="login"
          layout="vertical"
          onFinish={onFinish}
          disabled={loading}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="admin" autoComplete="username" autoFocus />
          </Form.Item>
          {method === 'password' ? (
            <Form.Item name="password" label="密码" preserve={false}
              rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>
          ) : (
            <Form.Item name="code" label="一次性恢复码" preserve={false}
              rules={[{ required: true, message: '请输入恢复码' }]}>
              <Input.Password autoComplete="off" maxLength={64} />
            </Form.Item>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
