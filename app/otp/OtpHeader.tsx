'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from 'antd';
import { LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { signOut, useSession } from 'next-auth/react';

export default function OtpHeader() {
  const { data: session } = useSession();
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-700 text-sm hidden sm:inline">
        {session?.user?.name ? `欢迎, ${session.user.name}` : null}
      </span>
      <Link href="/admin">
        <Button icon={<SettingOutlined />}>管理后台</Button>
      </Link>
      <Button icon={<LogoutOutlined />} onClick={() => signOut({ callbackUrl: '/login' })}>
        退出
      </Button>
    </div>
  );
}
