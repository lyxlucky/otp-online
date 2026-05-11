'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from 'antd';
import { LoginOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { signOut, useSession } from 'next-auth/react';

export default function OtpHeader() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-8" />;
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/login">
          <Button icon={<LoginOutlined />} type="primary" ghost>
            管理员登录
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-700 text-sm hidden sm:inline">
        欢迎, {session.user.name}
      </span>
      <Link href="/admin">
        <Button icon={<SettingOutlined />}>管理后台</Button>
      </Link>
      <Button icon={<LogoutOutlined />} onClick={() => signOut({ callbackUrl: '/otp' })}>
        退出
      </Button>
    </div>
  );
}
