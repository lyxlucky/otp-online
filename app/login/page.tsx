import { Suspense } from 'react';
import LoginClient from './LoginClient';

export const metadata = { title: '登录 · OTP 管理系统' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
