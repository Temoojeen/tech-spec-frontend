import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const isAuthenticated = !!token;
  
  const { pathname } = request.nextUrl;

  // Публичные маршруты, которые не требуют аутентификации
  const publicPaths = ['/login'];
  const isPublicPath = publicPaths.includes(pathname);

  // Если путь начинается с /api - пропускаем (это прокси на бэкенд)
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Если путь начинается с /_next - пропускаем (статические файлы Next.js)
  if (pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Если путь начинается с /favicon.ico - пропускаем
  if (pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // Если пользователь не авторизован и пытается зайти на защищенный маршрут
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Если пользователь авторизован и пытается зайти на login
  if (isAuthenticated && isPublicPath) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};