'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Space, Tabs, message } from 'antd';
import { QrcodeOutlined, LinkOutlined, CameraOutlined } from '@ant-design/icons';
import { parseOtpauthUrl, type ParsedOtpauth } from '@/lib/otpauth';

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

export default function ImportModal({ open, onClose, onImported }: Props) {
  const [urlInput, setUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const submitOne = async (parsed: ParsedOtpauth) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) {
        messageApi.error('保存失败');
        return false;
      }
      messageApi.success(`已导入 ${parsed.title}`);
      onImported();
      return true;
    } finally {
      setSubmitting(false);
    }
  };

  const handleUrlImport = async () => {
    const parsed = parseOtpauthUrl(urlInput);
    if (!parsed) {
      messageApi.error('URL 格式无效,请粘贴 otpauth://totp/... 开头的链接');
      return;
    }
    const ok = await submitOne(parsed);
    if (ok) {
      setUrlInput('');
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      title="导入令牌"
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={520}
    >
      {contextHolder}
      <Tabs
        items={[
          {
            key: 'url',
            label: (
              <span>
                <LinkOutlined /> 粘贴 URL
              </span>
            ),
            children: (
              <Space direction="vertical" size="middle" className="w-full">
                <Alert
                  type="info"
                  showIcon
                  message="otpauth:// URL"
                  description={
                    <span className="text-xs">
                      多数 Authenticator 应用("导出"或"显示密钥")会提供形如
                      <code className="mx-1 px-1 bg-gray-100 rounded">
                        otpauth://totp/Issuer:account?secret=...
                      </code>
                      的链接,粘贴到此即可。
                    </span>
                  }
                />
                <Input.TextArea
                  rows={4}
                  placeholder="otpauth://totp/GitHub:mail@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&digits=6&period=30"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <Button
                  type="primary"
                  loading={submitting}
                  onClick={handleUrlImport}
                  disabled={!urlInput.trim()}
                  block
                >
                  解析并导入
                </Button>
              </Space>
            ),
          },
          {
            key: 'scan',
            label: (
              <span>
                <QrcodeOutlined /> 扫码导入
              </span>
            ),
            children: (
              <QrScanner
                onResult={async (text) => {
                  const parsed = parseOtpauthUrl(text);
                  if (!parsed) {
                    messageApi.error('扫到的内容不是有效的 otpauth 链接');
                    return;
                  }
                  const ok = await submitOne(parsed);
                  if (ok) onClose();
                }}
                onError={(msg) => messageApi.error(msg)}
              />
            ),
          },
        ]}
      />
    </Modal>
  );
}

function QrScanner({
  onResult,
  onError,
}: {
  onResult: (text: string) => void;
  onError: (msg: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSupported(typeof window.BarcodeDetector === 'function');
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const start = async () => {
    if (!window.BarcodeDetector) {
      onError('当前浏览器不支持原生扫码 (BarcodeDetector)');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setScanning(true);

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const loop = async () => {
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            const text = codes[0].rawValue;
            stop();
            onResult(text);
            return;
          }
        } catch {
          /* ignore single frame errors */
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      onError((err as Error).message || '无法访问摄像头');
      stop();
    }
  };

  if (supported === false) {
    return (
      <Alert
        type="warning"
        showIcon
        message="当前浏览器不支持原生扫码"
        description="请使用 Chrome / Edge 等基于 Chromium 的浏览器,或改用「粘贴 URL」选项卡。"
      />
    );
  }

  return (
    <Space direction="vertical" size="middle" className="w-full">
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
            点击下方按钮开启摄像头
          </div>
        )}
      </div>
      {!scanning ? (
        <Button type="primary" icon={<CameraOutlined />} onClick={start} block>
          开启摄像头扫码
        </Button>
      ) : (
        <Button danger onClick={stop} block>
          停止扫码
        </Button>
      )}
    </Space>
  );
}
