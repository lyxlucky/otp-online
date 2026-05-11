import React from 'react';
import { asc, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Empty } from 'antd';
import { db } from '@/lib/db/client';
import { otpEntries } from '@/lib/db/schema';
import { decryptSecret } from '@/lib/crypto';
import OtpGrid, { type OtpEntryView } from './OtpGrid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Algorithm = 'SHA1' | 'SHA256' | 'SHA512';

export default async function Index() {
  const rows = await db
    .select()
    .from(otpEntries)
    .orderBy(desc(otpEntries.favorite), asc(otpEntries.sortOrder), asc(otpEntries.createdAt));

  const data: OtpEntryView[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    issuer: r.issuer,
    account: r.account,
    secret: decryptSecret({ cipher: r.secretCipher, iv: r.secretIv, tag: r.secretTag }),
    algorithm: r.algorithm as Algorithm,
    digits: r.digits,
    period: r.period,
    favorite: r.favorite,
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

  return <OtpGrid initial={data} />;
}
