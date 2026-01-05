import { NextResponse, type NextRequest } from 'next/server';

const DASHBOARD_COOKIE = 'dev_auth';

export default function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  if (searchParams.get('dev') === '1') {
    const response = NextResponse.next();
    response.cookies.set(DASHBOARD_COOKIE, '1', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });
    return response;
  }

  const hasSession = request.cookies.get(DASHBOARD_COOKIE)?.value === '1';
  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
