'use client';

import { authenticator } from 'otplib';
import { HashAlgorithms } from '@otplib/core';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { message, Tooltip } from 'antd';
import { BellOutlined, BellFilled, CopyOutlined, CheckOutlined, StarFilled, StarOutlined, LockFilled } from '@ant-design/icons';
import { useNotifyEnabled } from '@/lib/useNotifyEnabled';

type Algorithm = 'SHA1' | 'SHA256' | 'SHA512';

type Props = {
  id: string;
  title: string;
  secret: string;
  issuer?: string | null;
  account?: string | null;
  digits?: number;
  period?: number;
  algorithm?: Algorithm | string;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  adminOnly?: boolean;
};

type Palette = {
  bar: string;
  avatar: string;
  ringTrack: string;
  ringActive: string;
  ringText: string;
  tokenText: string;
  chipBg: string;
  chipText: string;
  chipHover: string;
  cardBorder: string;
  cardBorderHover: string;
  bellActiveBg: string;
  bellActiveHover: string;
};

const PALETTES: Palette[] = [
  {
    bar: 'from-rose-300 to-pink-400',
    avatar: 'from-rose-300 to-pink-400',
    ringTrack: 'text-rose-50',
    ringActive: 'text-rose-400',
    ringText: 'text-rose-600',
    tokenText: 'text-rose-900',
    chipBg: 'bg-rose-50',
    chipText: 'text-rose-700',
    chipHover: 'hover:bg-rose-100',
    cardBorder: 'border-rose-100',
    cardBorderHover: 'hover:border-rose-200',
    bellActiveBg: 'bg-rose-500',
    bellActiveHover: 'hover:bg-rose-600',
  },
  {
    bar: 'from-sky-300 to-blue-400',
    avatar: 'from-sky-300 to-blue-400',
    ringTrack: 'text-sky-50',
    ringActive: 'text-sky-400',
    ringText: 'text-sky-600',
    tokenText: 'text-sky-900',
    chipBg: 'bg-sky-50',
    chipText: 'text-sky-700',
    chipHover: 'hover:bg-sky-100',
    cardBorder: 'border-sky-100',
    cardBorderHover: 'hover:border-sky-200',
    bellActiveBg: 'bg-sky-500',
    bellActiveHover: 'hover:bg-sky-600',
  },
  {
    bar: 'from-emerald-300 to-teal-400',
    avatar: 'from-emerald-300 to-teal-400',
    ringTrack: 'text-emerald-50',
    ringActive: 'text-emerald-400',
    ringText: 'text-emerald-600',
    tokenText: 'text-emerald-900',
    chipBg: 'bg-emerald-50',
    chipText: 'text-emerald-700',
    chipHover: 'hover:bg-emerald-100',
    cardBorder: 'border-emerald-100',
    cardBorderHover: 'hover:border-emerald-200',
    bellActiveBg: 'bg-emerald-500',
    bellActiveHover: 'hover:bg-emerald-600',
  },
  {
    bar: 'from-amber-300 to-orange-400',
    avatar: 'from-amber-300 to-orange-400',
    ringTrack: 'text-amber-50',
    ringActive: 'text-amber-400',
    ringText: 'text-amber-600',
    tokenText: 'text-amber-900',
    chipBg: 'bg-amber-50',
    chipText: 'text-amber-700',
    chipHover: 'hover:bg-amber-100',
    cardBorder: 'border-amber-100',
    cardBorderHover: 'hover:border-amber-200',
    bellActiveBg: 'bg-amber-500',
    bellActiveHover: 'hover:bg-amber-600',
  },
  {
    bar: 'from-violet-300 to-purple-400',
    avatar: 'from-violet-300 to-purple-400',
    ringTrack: 'text-violet-50',
    ringActive: 'text-violet-400',
    ringText: 'text-violet-600',
    tokenText: 'text-violet-900',
    chipBg: 'bg-violet-50',
    chipText: 'text-violet-700',
    chipHover: 'hover:bg-violet-100',
    cardBorder: 'border-violet-100',
    cardBorderHover: 'hover:border-violet-200',
    bellActiveBg: 'bg-violet-500',
    bellActiveHover: 'hover:bg-violet-600',
  },
  {
    bar: 'from-cyan-300 to-teal-400',
    avatar: 'from-cyan-300 to-teal-400',
    ringTrack: 'text-cyan-50',
    ringActive: 'text-cyan-400',
    ringText: 'text-cyan-600',
    tokenText: 'text-cyan-900',
    chipBg: 'bg-cyan-50',
    chipText: 'text-cyan-700',
    chipHover: 'hover:bg-cyan-100',
    cardBorder: 'border-cyan-100',
    cardBorderHover: 'hover:border-cyan-200',
    bellActiveBg: 'bg-cyan-500',
    bellActiveHover: 'hover:bg-cyan-600',
  },
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
  id,
  title,
  secret,
  issuer,
  account,
  digits = 6,
  period = 30,
  algorithm = 'SHA1',
  favorite = false,
  onToggleFavorite,
  adminOnly = false,
}: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const [token, setToken] = useState('');
  const [remaining, setRemaining] = useState(period);
  const [copied, setCopied] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useNotifyEnabled(id);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifyEnabledRef = useRef(notifyEnabled);
  useEffect(() => {
    notifyEnabledRef.current = notifyEnabled;
  }, [notifyEnabled]);

  const palette = useMemo(
    () => PALETTES[hashIndex(id || title || secret, PALETTES.length)],
    [id, title, secret],
  );
  const initial = (issuer || title || '?').trim().charAt(0).toUpperCase();

  const calcRemaining = () => {
    const now = Math.floor(Date.now() / 1000);
    return period - (now % period);
  };

  const pushNotification = (tokenValue: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const formatted = formatToken(tokenValue, digits);
    const n = new Notification(title, {
      body: `${formatted}\n点击通知复制到剪贴板`,
      tag: `otp-${id}`,
      icon: '/favicon.ico',
      silent: true,
    });
    n.onclick = async () => {
      try {
        window.focus();
        n.close();
        await navigator.clipboard.writeText(tokenValue);
        messageApi.success({ content: `已复制 ${tokenValue}`, duration: 1.5 });
      } catch {
        messageApi.error('复制失败,请手动复制');
      }
    };
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
    if (notifyEnabledRef.current) {
      pushNotification(next);
    }
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

  const onToggleNotify = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notifyEnabled) {
      setNotifyEnabled(false);
      messageApi.info(`已关闭 ${title} 的通知`);
      return;
    }
    if (typeof window === 'undefined' || !('Notification' in window)) {
      messageApi.error('当前浏览器不支持系统通知');
      return;
    }
    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
    }
    if (perm !== 'granted') {
      messageApi.warning('通知权限被拒绝,请到浏览器站点设置中开启');
      return;
    }
    setNotifyEnabled(true);
    messageApi.success(`已开启 ${title} 的通知`);
    if (token) pushNotification(token);
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
        className={`relative h-full overflow-hidden rounded-2xl bg-white shadow-sm border
                    transition-all duration-300
                    hover:shadow-xl hover:-translate-y-1 cursor-pointer
                    ${palette.cardBorder} ${palette.cardBorderHover}`}
      >
        {/* top accent bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${palette.bar}`} />

        {/* favorite indicator (top-left) — shown when favorite, or as a toggle when handler provided */}
        {(favorite || onToggleFavorite) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.();
            }}
            disabled={!onToggleFavorite}
            title={favorite ? '已收藏 · 点击取消置顶' : '点击收藏并置顶'}
            className={`absolute top-3 left-3 z-10 inline-flex items-center justify-center
                        w-8 h-8 rounded-full transition-all
                        ${onToggleFavorite ? 'cursor-pointer' : 'cursor-default'}
                        ${
                          favorite
                            ? 'text-amber-400'
                            : onToggleFavorite
                              ? 'text-gray-300 hover:text-amber-400'
                              : 'hidden'
                        }`}
            aria-label="切换收藏"
          >
            {favorite ? <StarFilled /> : <StarOutlined />}
          </button>
        )}

        {/* notify toggle (top-right) */}
        <Tooltip
          title={
            notifyEnabled
              ? '点击关闭:不再推送通知'
              : '点击开启:每次刷新自动推送 Windows 通知,点通知复制'
          }
        >
          <button
            type="button"
            onClick={onToggleNotify}
            className={`absolute top-3 right-3 z-10 inline-flex items-center justify-center
                        w-8 h-8 rounded-full transition-all
                        ${
                          notifyEnabled
                            ? `${palette.bellActiveBg} ${palette.bellActiveHover} text-white shadow-md`
                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                        }`}
            aria-label="切换通知"
          >
            {notifyEnabled ? <BellFilled /> : <BellOutlined />}
          </button>
        </Tooltip>

        <div className="p-5">
          {/* header: avatar + title + account */}
          <div className={`flex items-start gap-3 pr-10 ${favorite || onToggleFavorite ? 'pl-10' : ''}`}>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                          bg-gradient-to-br ${palette.avatar}
                          text-white font-semibold text-lg shadow-sm`}
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="truncate text-[15px] font-semibold text-gray-900" title={title}>
                  {title}
                </div>
                {adminOnly && (
                  <Tooltip title="管理员专属:仅登录后可见">
                    <LockFilled className="text-amber-500 text-xs shrink-0" />
                  </Tooltip>
                )}
              </div>
              <div className="truncate text-xs text-gray-500" title={account || issuer || ''}>
                {account || issuer || ' '}
              </div>
            </div>
          </div>

          {/* token */}
          <div className="my-5 flex items-center justify-center">
            <span
              className={`font-mono tabular-nums tracking-[0.15em] text-[34px] leading-none transition-colors
                          ${lowTime ? 'text-rose-600' : palette.tokenText}`}
            >
              {token ? formatToken(token, digits) : '— — —'}
            </span>
          </div>

          {/* footer: ring + copy */}
          <div className="flex items-center justify-between">
            <div className="relative" style={{ width: ringSize, height: ringSize }}>
              <svg width={ringSize} height={ringSize} className="-rotate-90">
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={stroke}
                  fill="none"
                  className={palette.ringTrack}
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
                    lowTime ? 'text-rose-500' : palette.ringActive
                  }`}
                />
              </svg>
              <span
                className={`absolute inset-0 flex items-center justify-center text-[11px] font-semibold
                            ${lowTime ? 'text-rose-600' : palette.ringText}`}
              >
                {remaining}
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
                              : `${palette.chipBg} ${palette.chipText} ${palette.chipHover}`
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
