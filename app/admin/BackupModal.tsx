'use client';

import { useState } from 'react';
import { Alert, Button, Checkbox, Form, Input, Modal } from 'antd';
import { encryptBackup, isEncryptedBackup, readBackup, type Backup } from '@/lib/backup';

type Props = {
  mode: 'export' | 'restore';
  onClose: () => void;
  onRestored: (imported: number, skipped: number) => void;
};

export default function BackupModal({ mode, onClose, onRestored }: Props) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [file, setFile] = useState<unknown>();
  const [preview, setPreview] = useState<Backup>();
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [restoreId, setRestoreId] = useState('');
  const [counts, setCounts] = useState({ imported: 0, skipped: 0 });
  const exporting = mode === 'export';
  const encrypted = isEncryptedBackup(file);

  async function chooseFile(selected?: File) {
    setFile(undefined);
    setPreview(undefined);
    setProgress(0);
    setCounts({ imported: 0, skipped: 0 });
    setRestoreId('');
    setPassword('');
    setError('');
    if (!selected) return;
    if (selected.size > 16 * 1024 * 1024) {
      setError('请选择不超过 16 MB 的 JSON 备份');
      return;
    }
    setBusy(true);
    try {
      setFile(JSON.parse(await selected.text()));
    } catch {
      setError('无法读取 JSON 备份');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError('');
    if (!window.isSecureContext) {
      setError('使用备份功能需要 HTTPS 或 localhost');
      return;
    }
    setBusy(true);
    let { imported, skipped } = counts;
    try {
      if (exporting) {
        if (password.length < 12 || password !== confirmation) {
          setError('请设置至少 12 个字符的口令，并确认两次输入相同');
          return;
        }
        const response = await fetch('/api/entries/export', { cache: 'no-store' });
        if (!response.ok) throw new Error('读取待备份条目失败');
        const data = await encryptBackup(await response.json(), password);
        const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `otp-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        onClose();
        return;
      }
      if (!preview) {
        setPreview(await readBackup(file, password));
        setRestoreId(crypto.randomUUID());
        setPassword('');
        return;
      }

      for (let offset = progress; offset < preview.entries.length; offset += 100) {
        const entries = preview.entries.slice(offset, offset + 100);
        const response = await fetch('/api/entries/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: preview.version, entries, skipDuplicates, restore: { id: restoreId, offset },
          }),
        });
        if (!response.ok) throw new Error('恢复条目失败，可从已确认的进度重试');
        const result = await response.json() as { imported: number; skipped?: number };
        imported += result.imported;
        skipped += result.skipped ?? 0;
        setCounts({ imported, skipped });
        setProgress(offset + entries.length);
      }
      onRestored(imported, skipped);
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== 'ZodError' ? cause.message : '备份格式无效');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title={exporting ? '导出加密备份' : '从备份恢复'}
      onCancel={onClose} closable={!busy} maskClosable={false} keyboard={!busy}
      footer={null}>
      <Form layout="vertical" onFinish={submit} disabled={busy}>
        {error && <Alert className="mb-4" type="error" showIcon message={error} />}
        {exporting && <p>备份在浏览器中加密。恢复时需要此口令，请单独保存。</p>}
        {!exporting && (
          <Form.Item label="JSON 备份文件" htmlFor="backup-file">
            <input id="backup-file" type="file" accept=".json,application/json" disabled={busy}
              onChange={(event) => void chooseFile(event.target.files?.[0])} />
          </Form.Item>
        )}
        {(exporting || (encrypted && !preview)) && (
          <Form.Item label="备份口令" htmlFor="backup-password">
            <Input.Password id="backup-password" value={password} maxLength={256}
              autoComplete={exporting ? 'new-password' : 'current-password'}
              onChange={(event) => setPassword(event.target.value)} />
          </Form.Item>
        )}
        {exporting && (
          <Form.Item label="确认备份口令" htmlFor="backup-confirmation">
            <Input.Password id="backup-confirmation" value={confirmation} maxLength={256}
              autoComplete="new-password" onChange={(event) => setConfirmation(event.target.value)} />
          </Form.Item>
        )}
        {preview && (
          <>
            <Alert className="mb-3" type="info" showIcon
              message={`备份包含 ${preview.entries.length} 条令牌${progress ? `，已处理 ${progress} 条` : ''}`}
              description="令牌会保留备份中的可见性设置。" />
            <ul className="mb-3 max-h-44 list-disc overflow-auto pl-5 break-words">
              {preview.entries.slice(0, 20).map((entry, index) => <li key={index}>{entry.title}</li>)}
              {preview.entries.length > 20 && <li>另有 {preview.entries.length - 20} 条</li>}
            </ul>
            <Checkbox disabled={busy || progress > 0} checked={skipDuplicates}
              onChange={(event) => setSkipDuplicates(event.target.checked)}>跳过重复令牌</Checkbox>
          </>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button disabled={busy} onClick={onClose}>取消</Button>
          <Button htmlType="submit" type="primary" loading={busy}
            disabled={!exporting && (file === undefined || preview?.entries.length === 0)}>
            {exporting ? '下载加密备份' : preview ? '确认恢复' : '预览备份'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
