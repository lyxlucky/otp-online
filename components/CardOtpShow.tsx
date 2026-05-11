'use client';

import { authenticator } from 'otplib';
import { HashAlgorithms } from '@otplib/core';
import React, { useState, useEffect, useRef } from 'react';
import { message, Tooltip } from 'antd';
import { BellOutlined, BellFilled, CopyOutlined, CheckOutlined } from '@ant-design/icons';
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
};

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
        className="relative h-full overflow-hidden rounded-2xl bg-white shadow-sm border border-blue-100
                   transition-all duration-300
                   hover:shadow-xl hover:-translate-y-1 hover:border-blue-200
                   cursor-pointer"
      >
        {/* top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-blue-600" />

        {/* notify toggle (top-right) */}
        <Tooltip title={notifyEnabled ? '点击关闭通知' : '点击开启:每次刷新自动推送 Windows 通知'}>
          <button
            type="button"
            onClick={onToggleNotify}
            className={`absolute top-3 right-3 z-10 inline-flex items-center justify-center
                        w-8 h-8 rounded-full transition-all
                        ${
                          notifyEnabled
                            ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                            : 'bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600'
                        }`}
            aria-label="切换通知"
          >
            {notifyEnabled ? <BellFilled /> : <BellOutlined />}
          </button>
        </Tooltip>

        <div className="p-5">
          {/* header: avatar + title + account */}
          <div className="flex items-start gap-3 pr-10">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                         bg-gradient-to-br from-blue-500 to-blue-700
                         text-white font-semibold text-lg shadow-sm"
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold text-gray-900" title={title}>
                {title}
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
                          ${lowTime ? 'text-rose-600' : 'text-blue-900'}`}
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
                  className="text-blue-50"
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
                    lowTime ? 'text-rose-500' : 'text-blue-500'
                  }`}
                />
              </svg>
              <span
                className={`absolute inset-0 flex items-center justify-center text-[11px] font-semibold
                            ${lowTime ? 'text-rose-600' : 'text-blue-700'}`}
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
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
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
