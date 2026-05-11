'use client';

import { useEffect, useState } from 'react';

const KEY_PREFIX = 'otp:notify:';
const CHANGE_EVENT = 'otp:notify-changed';

function readKey(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KEY_PREFIX + id) === '1';
  } catch {
    return false;
  }
}

export function useNotifyEnabled(id: string) {
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    setEnabled(readKey(id));
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ id?: string }>;
      if (!ce.detail?.id || ce.detail.id === id) {
        setEnabled(readKey(id));
      }
    };
    const storageHandler = (e: StorageEvent) => {
      if (e.key === KEY_PREFIX + id) setEnabled(readKey(id));
    };
    window.addEventListener(CHANGE_EVENT, handler as EventListener);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler as EventListener);
      window.removeEventListener('storage', storageHandler);
    };
  }, [id]);

  const set = (v: boolean) => {
    try {
      window.localStorage.setItem(KEY_PREFIX + id, v ? '1' : '0');
    } catch {
      /* ignore */
    }
    setEnabled(v);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { id } }));
  };

  return [enabled, set] as const;
}
