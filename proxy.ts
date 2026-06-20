import { decrypt } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

const unprotectedRoutes = [
  '/login',
  '/register',
  '/setup',
];

export async function proxy(request: NextRequest) {
  const encryptedSessionData = request.cookies.get('session')?.value;
  const session = encryptedSessionData ? await decrypt(encryptedSessionData) : null;
  const { pathname } = request.nextUrl;

  const isShareRoute = pathname.startsWith('/share/');

  if (session != null && unprotectedRoutes.indexOf(pathname) > -1) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (session == null && unprotectedRoutes.indexOf(pathname) == -1 && !isShareRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
