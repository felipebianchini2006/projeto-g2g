import { NextResponse, type NextRequest } from 'next/server';

const REFRESH_COOKIE = 'g2g_refresh';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedPaths = [
    '/dashboard',
    '/conta',
    '/pedidos',
    '/tickets',
    '/vendas',
    '/admin',
    '/carteira',
  ];

  const needsAuth = protectedPaths.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!needsAuth) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);
  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/conta/:path*',
    '/pedidos/:path*',
    '/tickets/:path*',
    '/vendas/:path*',
    '/admin/:path*',
    '/carteira/:path*',
  ],
};
