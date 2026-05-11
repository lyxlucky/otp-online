import React from 'react';
import { asc } from 'drizzle-orm';
import Link from 'next/link';
import CardOtpShow from '@/components/CardOtpShow';
import { Empty } from 'antd';
import { db } from '@/lib/db/client';
import { otpEntries } from '@/lib/db/schema';
import { decryptSecret } from '@/lib/crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Algorithm = 'SHA1' | 'SHA256' | 'SHA512';

export default async function Index() {
  const rows = await db
    .select()
    .from(otpEntries)
    .orderBy(asc(otpEntries.sortOrder), asc(otpEntries.createdAt));

  const data = rows.map((r) => ({
    id: r.id,
    title: r.title,
    issuer: r.issuer,
    account: r.account,
    secret: decryptSecret({ cipher: r.secretCipher, iv: r.secretIv, tag: r.secretTag }),
    algorithm: r.algorithm as Algorithm,
    digits: r.digits,
    period: r.period,
  }));

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="rounded-2xl bg-white/70 backdrop-blur-md shadow-sm border border-white/60 px-8 py-12 max-w-md w-full">
          <Empty
            description={
              <div className="space-y-2">
                <div className="text-gray-700 text-base">暂无 OTP 条目</div>
                <div className="text-xs text-gray-500">
                  <Link href="/admin" className="text-blue-600 hover:underline">
                    登录管理后台
                  </Link>
                  &nbsp;添加你的第一条令牌
                </div>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-blue-900">我的令牌</h1>
          <p className="text-sm text-blue-700/70 mt-1">
            共 {data.length} 条 · 点击卡片即可复制当前验证码
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {data.map((item) => (
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
          />
        ))}
      </div>
    </div>
  );
}
