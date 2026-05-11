'use client';

import { authenticator } from 'otplib';
import { HashAlgorithms } from '@otplib/core';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { message } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';

type Algorithm = 'SHA1' | 'SHA256' | 'SHA512';

type Props = {
  title: string;
  secret: string;
  issuer?: string | null;
  account?: string | null;
  digits?: number;
  period?: number;
  algorithm?: Algorithm | string;
};

const HUE_PALETTE: { from: string; to: string; ring: string; chip: string }[] = [
  { from: 'from-indigo-500', to: 'to-blue-500', ring: 'text-indigo-500', chip: 'bg-indigo-50 text-indigo-700' },
  { from: 'from-emerald-500', to: 'to-teal-500', ring: 'text-emerald-500', chip: 'bg-emerald-50 text-emerald-700' },
  { from: 'from-fuchsia-500', to: 'to-pink-500', ring: 'text-fuchsia-500', chip: 'bg-fuchsia-50 text-fuchsia-700' },
  { from: 'from-amber-500', to: 'to-orange-500', ring: 'text-amber-500', chip: 'bg-amber-50 text-amber-700' },
  { from: 'from-sky-500', to: 'to-cyan-500', ring: 'text-sky-500', chip: 'bg-sky-50 text-sky-700' },
  { from: 'from-violet-500', to: 'to-purple-500', ring: 'text-violet-500', chip: 'bg-violet-50 text-violet-700' },
];

function hashIndex(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function formatToken(token: string, digits: number) {
  if (digits === 6) return token.slice(0, 3) + ' ' + token.slice(3);
  if (digits === 8) return token.slice(0, 4) + ' ' + token.slice(4);
  return token;
}

export default function CardOtpShow({
  title,
  secret,
  issuer,
  account,
  digits = 6,
  period = 30,
  algorithm = 'SHA1',
}: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const [token, setToken] = useState('');
  const [remaining, setRemaining] = useState(period);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const palette = useMemo(
    () => HUE_PALETTE[hashIndex(title || secret, HUE_PALETTE.length)],
    [title, secret],
  );
  const initial = (issuer || title || '?').trim().charAt(0).toUpperCase();

  const calcRemaining = () => {
    const now = Math.floor(Date.now() / 1000);
    return period - (now % period);
  };

  const refreshToken = () => {
    if (!secret) return;
    const algoKey = String(algorithm).toUpperCase() as keyof typeof HashAlgorithms;
    authenticator.options = {
      digits,
      step: period,
      algorithm: HashAlgorithms[algoKey] ?? HashAlgorithms.SHA1,
    };
    const next = authenticator.generate(secret);
    setToken(next);
    const r = calcRemaining();
    setRemaining(r);
    timeoutRef.current = setTimeout(refreshToken, r * 1000);
  };

  useEffect(() => {
    refreshToken();
    intervalRef.current = setInterval(() => setRemaining(calcRemaining()), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret, digits, period, algorithm]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      messageApi.success({ content: `已复制 ${token}`, duration: 1.5 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      messageApi.error('复制失败');
    }
  };

  const ringSize = 44;
  const stroke = 4;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = remaining / period;
  const dash = circumference * progress;
  const lowTime = remaining <= 5;

  return (
    <div className="group relative w-full" onClick={onCopy} role="button" tabIndex={0}>
      {contextHolder}
      <div
        className={`relative h-full overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100
                    transition-all duration-300
                    hover:shadow-xl hover:-translate-y-1 hover:border-gray-200
                    cursor-pointer`}
      >
        {/* top accent bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${palette.from} ${palette.to}`} />

        <div className="p-5">
          {/* header: avatar + title + account */}
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                          bg-gradient-to-br ${palette.from} ${palette.to}
                          text-white font-semibold text-lg shadow-sm`}
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold text-gray-900" title={title}>
                {title}
              </div>
              <div className="truncate text-xs text-gray-500" title={account || issuer || ''}>
                {account || issuer || ' '}
              </div>
            </div>
          </div>

          {/* token */}
          <div className="my-5 flex items-center justify-center">
            <span
              className={`font-mono tabular-nums tracking-[0.15em] text-[34px] leading-none transition-colors
                          ${lowTime ? 'text-rose-600' : 'text-gray-900'}`}
            >
              {token ? formatToken(token, digits) : '— — —'}
            </span>
          </div>

          {/* footer: ring + chips + copy */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative" style={{ width: ringSize, height: ringSize }}>
                <svg width={ringSize} height={ringSize} className="-rotate-90">
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={stroke}
                    fill="none"
                    className="text-gray-100"
                  />
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={stroke}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circumference}`}
                    className={`transition-[stroke-dasharray] duration-1000 ease-linear ${
                      lowTime ? 'text-rose-500' : palette.ring
                    }`}
                  />
                </svg>
                <span
                  className={`absolute inset-0 flex items-center justify-center text-[11px] font-semibold
                              ${lowTime ? 'text-rose-600' : 'text-gray-700'}`}
                >
                  {remaining}
                </span>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${palette.chip}`}>
                {String(algorithm).toUpperCase()} · {digits}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
                          transition-all
                          ${
                            copied
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
            >
              {copied ? (
                <>
                  <CheckOutlined /> 已复制
                </>
              ) : (
                <>
                  <CopyOutlined /> 复制
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
