'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Input, message } from 'antd';
import type { InputRef } from 'antd';
import { SearchOutlined, EnterOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { authenticator } from 'otplib';
import { HashAlgorithms } from '@otplib/core';
import type { OtpEntryView } from './OtpGrid';

const PALETTE_TINTS = [
  'from-rose-300 to-pink-400',
  'from-sky-300 to-blue-400',
  'from-emerald-300 to-teal-400',
  'from-amber-300 to-orange-400',
  'from-violet-300 to-purple-400',
  'from-cyan-300 to-teal-400',
];

function hashIndex(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function generateToken(e: OtpEntryView): string {
  const algoKey = String(e.algorithm).toUpperCase() as keyof typeof HashAlgorithms;
  authenticator.options = {
    digits: e.digits,
    step: e.period,
    algorithm: HashAlgorithms[algoKey] ?? HashAlgorithms.SHA1,
  };
  return authenticator.generate(e.secret);
}

function formatToken(token: string, digits: number) {
  if (digits === 6) return token.slice(0, 3) + ' ' + token.slice(3);
  if (digits === 8) return token.slice(0, 4) + ' ' + token.slice(4);
  return token;
}

export default function SpotlightSearch({ entries }: { entries: OtpEntryView[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<InputRef>(null);
  const [messageApi, contextHolder] = message.useMessage();

  // Listen for double-Space anywhere on the page (outside input/textarea)
  // and for an explicit 'spotlight:open' custom event from buttons.
  useEffect(() => {
    let lastSpaceAt = 0;
    const keyHandler = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (t && t.isContentEditable)
      ) {
        return;
      }
      const now = performance.now();
      if (now - lastSpaceAt < 350) {
        e.preventDefault();
        setOpen(true);
        lastSpaceAt = 0;
      } else {
        lastSpaceAt = now;
      }
    };
    const openHandler = () => setOpen(true);
    window.addEventListener('keydown', keyHandler);
    window.addEventListener('spotlight:open', openHandler);
    return () => {
      window.removeEventListener('keydown', keyHandler);
      window.removeEventListener('spotlight:open', openHandler);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus({ cursor: 'end' }), 50);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries.slice(0, 8);
    return entries
      .filter((e) =>
        [e.title, e.issuer, e.account].some((v) =>
          v ? v.toLowerCase().includes(q) : false,
        ),
      )
      .slice(0, 8);
  }, [entries, query]);

  useEffect(() => {
    setSelected(0);
  }, [results.length, query]);

  const selectAndCopy = async (entry: OtpEntryView) => {
    try {
      const token = generateToken(entry);
      await navigator.clipboard.writeText(token);
      messageApi.success({ content: `${entry.title} · ${token}`, duration: 1.5 });
      setOpen(false);
    } catch {
      messageApi.error('复制失败');
    }
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[selected];
      if (target) selectAndCopy(target);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        closable={false}
        width={580}
        centered
        destroyOnClose
        styles={{
          body: { padding: 0 },
          content: { padding: 0, borderRadius: 16, overflow: 'hidden' },
          mask: { backdropFilter: 'blur(4px)', background: 'rgba(15, 23, 42, 0.4)' },
        }}
      >
        <div className="bg-white">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <SearchOutlined className="text-gray-400 text-lg" />
            <Input
              ref={inputRef}
              variant="borderless"
              placeholder="搜索令牌名 / 颁发者 / 账号 ..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              size="large"
              style={{ fontSize: 17, padding: 0 }}
            />
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[11px]">
              ESC
            </span>
          </div>

          <div className="max-h-[380px] overflow-y-auto py-2">
            {results.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-400">
                没有匹配的令牌
              </div>
            ) : (
              results.map((entry, idx) => {
                const tint = PALETTE_TINTS[hashIndex(entry.id || entry.title, PALETTE_TINTS.length)];
                const initial = (entry.issuer || entry.title || '?').trim().charAt(0).toUpperCase();
                const isSel = idx === selected;
                let preview = '';
                try {
                  preview = formatToken(generateToken(entry), entry.digits);
                } catch {
                  preview = '— — —';
                }
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onMouseEnter={() => setSelected(idx)}
                    onClick={() => selectAndCopy(entry)}
                    className={`group w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors
                                ${isSel ? 'bg-blue-50' : 'bg-white'}`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                                  bg-gradient-to-br ${tint} text-white font-semibold text-base shadow-sm`}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {entry.title}
                        {entry.favorite ? (
                          <span className="ml-1.5 text-amber-400 text-xs align-middle">★</span>
                        ) : null}
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        {entry.account || entry.issuer || ' '}
                      </div>
                    </div>
                    <div className="font-mono tabular-nums text-blue-700 text-sm tracking-wider">
                      {preview}
                    </div>
                    {isSel && (
                      <EnterOutlined className="text-blue-500 text-xs hidden sm:inline" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-500">
            <div className="flex items-center gap-3">
              <KbdHint label="↑↓" hint="选择" />
              <KbdHint label="Enter" hint="复制" />
              <KbdHint label="Esc" hint="关闭" />
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <ThunderboltOutlined />
              <span>双击空格随时唤起</span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

function KbdHint({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600 font-mono text-[10px]">
        {label}
      </kbd>
      <span>{hint}</span>
    </span>
  );
}
