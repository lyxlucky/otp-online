import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthed = !!req.auth?.user;
  const isLoginPage = nextUrl.pathname === '/login';

  if (isLoginPage) {
    if (isAuthed) {
      return NextResponse.redirect(new URL('/otp', nextUrl));
    }
    return;
  }

  if (!isAuthed) {
    if (nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const url = new URL('/login', nextUrl);
    url.searchParams.set('callbackUrl', nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ['/admin/:path*', '/api/entries/:path*', '/login'],
};
