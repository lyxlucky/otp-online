import React from 'react';
import { asc } from 'drizzle-orm';
import CardOtpShow from '@/components/CardOtpShow';
import { Empty } from 'antd';
import { db } from '@/lib/db/client';
import { otpEntries } from '@/lib/db/schema';
import { decryptSecret } from '@/lib/crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function Index() {
  const rows = await db
    .select()
    .from(otpEntries)
    .orderBy(asc(otpEntries.sortOrder), asc(otpEntries.createdAt));

  const data = rows.map((r) => ({
    id: r.id,
    title: r.title,
    secret: decryptSecret({ cipher: r.secretCipher, iv: r.secretIv, tag: r.secretTag }),
  }));

  if (data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <Empty description="暂无 OTP 条目,请到管理后台添加" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-6 justify-center">
      {data.map((item) => (
        <CardOtpShow key={item.id} title={item.title} secret={item.secret} />
      ))}
    </div>
  );
}
