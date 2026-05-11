'use client';

import React, { useMemo, useState } from 'react';
import { Empty, message } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import CardOtpShow from '@/components/CardOtpShow';
import SpotlightSearch from './SpotlightSearch';

type Algorithm = 'SHA1' | 'SHA256' | 'SHA512';

export type OtpEntryView = {
  id: string;
  title: string;
  issuer: string | null;
  account: string | null;
  secret: string;
  algorithm: Algorithm;
  digits: number;
  period: number;
  favorite: boolean;
  adminOnly: boolean;
};

export default function OtpGrid({ initial }: { initial: OtpEntryView[] }) {
  const [entries, setEntries] = useState<OtpEntryView[]>(initial);
  const { data: session } = useSession();
  const isAuthed = !!session?.user;
  const [messageApi, contextHolder] = message.useMessage();

  const onToggleFavorite = async (id: string) => {
    const current = entries.find((e) => e.id === id);
    if (!current) return;
    const next = !current.favorite;
    setEntries((cur) => cur.map((e) => (e.id === id ? { ...e, favorite: next } : e)));
    const res = await fetch(`/api/entries/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ favorite: next }),
    });
    if (!res.ok) {
      messageApi.error('更新收藏失败');
      setEntries((cur) => cur.map((e) => (e.id === id ? { ...e, favorite: !next } : e)));
    }
  };

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return 0;
    });
  }, [entries]);

  return (
    <div className="space-y-6">
      {contextHolder}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-blue-900">我的令牌</h1>
          <p className="text-sm text-blue-700/70 mt-1">
            共 {entries.length} 条{isAuthed ? ' · 点击星标置顶' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('spotlight:open'))}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/70 border border-blue-100
                     text-sm text-gray-600 hover:bg-white hover:border-blue-200 transition-all
                     shadow-sm"
          title="或按两次空格"
        >
          <ThunderboltOutlined className="text-blue-500" />
          <span>搜索</span>
          <span className="hidden sm:inline-flex items-center gap-1 ml-2 text-[11px] text-gray-400">
            按
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 font-mono">
              Space
            </kbd>
            ×2
          </span>
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Empty description="暂无 OTP 条目" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sorted.map((item) => (
            <CardOtpShow
              key={item.id}
              id={item.id}
              title={item.title}
              secret={item.secret}
              issuer={item.issuer}
              account={item.account}
              digits={item.digits}
              period={item.period}
              algorithm={item.algorithm}
              favorite={item.favorite}
              adminOnly={item.adminOnly}
              onToggleFavorite={isAuthed ? () => onToggleFavorite(item.id) : undefined}
            />
          ))}
        </div>
      )}

      <SpotlightSearch entries={sorted} />
    </div>
  );
}
