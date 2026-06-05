import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Paths that require authentication
  const isAdminPath = pathname.startsWith('/hq-admin-v2');
  const isProtectedApi = pathname.startsWith('/api/tournaments') || pathname.startsWith('/api/upload');
  const isLoginPage = pathname === '/hq-admin-v2/login';

  if (isAdminPath || isProtectedApi) {
    // Check for our secure session cookie
    const sessionCookie = req.cookies.get('admin_session');
    const isAuthenticated = sessionCookie?.value === 'authenticated';

    if (!isAuthenticated && !isLoginPage) {
      if (isProtectedApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Redirect unauthenticated users to the hidden login page
      return NextResponse.redirect(new URL('/hq-admin-v2/login', req.url));
    }

    if (isAuthenticated && isLoginPage) {
      // If already logged in, don't show the login page again
      return NextResponse.redirect(new URL('/hq-admin-v2', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/hq-admin-v2/:path*', '/api/tournaments/:path*', '/api/upload/:path*'],
};
