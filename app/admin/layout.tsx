'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from 'antd';
import { LogoutOutlined, AppstoreOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { signOut, useSession } from 'next-auth/react';
import SecurityModal from './SecurityModal';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [securityOpen, setSecurityOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-blue-50">
      <nav className="bg-white/70 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-48 bg-blue-100 h-10 rounded-md flex items-center justify-center text-blue-800">
                OTP 管理后台
              </div>
              <Link href="/otp">
                <Button icon={<AppstoreOutlined />}>查看令牌</Button>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-700 text-sm">
                {session?.user?.name ? `欢迎, ${session.user.name}` : null}
              </span>
              <Button icon={<SafetyCertificateOutlined />} onClick={() => setSecurityOpen(true)}>
                账户安全
              </Button>
              <Button
                icon={<LogoutOutlined />}
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                退出
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow p-6">
        <div className="container mx-auto bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6">
          {children}
        </div>
      </main>
      {securityOpen && <SecurityModal onClose={() => setSecurityOpen(false)} />}

      <footer className="py-4 text-center text-sm text-gray-600 bg-white/50 backdrop-blur-sm">
        OTP Online © {new Date().getFullYear()} Created by Mr.liao
      </footer>
    </div>
  );
}
