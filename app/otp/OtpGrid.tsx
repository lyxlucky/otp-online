'use client';

import React, { useMemo, useState } from 'react';
import { Empty, Input, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import CardOtpShow from '@/components/CardOtpShow';

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
};

export default function OtpGrid({ initial }: { initial: OtpEntryView[] }) {
  const [entries, setEntries] = useState<OtpEntryView[]>(initial);
  const [search, setSearch] = useState('');
  const { data: session } = useSession();
  const isAuthed = !!session?.user;
  const [messageApi, contextHolder] = message.useMessage();

  const onToggleFavorite = async (id: string) => {
    const current = entries.find((e) => e.id === id);
    if (!current) return;
    const next = !current.favorite;
    setEntries((cur) =>
      cur.map((e) => (e.id === id ? { ...e, favorite: next } : e)),
    );
    const res = await fetch(`/api/entries/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ favorite: next }),
    });
    if (!res.ok) {
      messageApi.error('更新收藏失败');
      setEntries((cur) =>
        cur.map((e) => (e.id === id ? { ...e, favorite: !next } : e)),
      );
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? entries.filter((e) =>
          [e.title, e.issuer, e.account].some((v) => v?.toLowerCase().includes(q)),
        )
      : entries;
    return [...base].sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return 0;
    });
  }, [entries, search]);

  return (
    <div className="space-y-6">
      {contextHolder}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-blue-900">我的令牌</h1>
          <p className="text-sm text-blue-700/70 mt-1">
            共 {entries.length} 条
            {search ? ` · 匹配 ${filtered.length} 条` : ''}
            {isAuthed ? ' · 点击星标置顶' : ''}
          </p>
        </div>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索标题 / 颁发者 / 账号"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Empty description={search ? '没有匹配的条目' : '暂无 OTP 条目'} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((item) => (
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
              onToggleFavorite={
                isAuthed ? () => onToggleFavorite(item.id) : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
