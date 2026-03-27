import { type NextRequest, NextResponse } from 'next/server';

const ASSOCIATION_ROLE = 'IYALOJA';
const CLINIC_ROLE = 'CLINIC_ADMIN';

export const middleware = (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('omo_session')?.value;
  const role = request.cookies.get('omo_role')?.value;

  const needsAuth = session !== '1' || !role;

  if (pathname.startsWith('/clinic')) {
    if (needsAuth || role !== CLINIC_ROLE) {
      const url = request.nextUrl.clone();
      url.pathname = '/login/clinic';
      url.search = '';
      url.searchParams.set('next', pathname);
      if (needsAuth) {
        return NextResponse.redirect(url);
      }
      url.searchParams.set('reason', 'role');
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith('/association')) {
    if (needsAuth || role !== ASSOCIATION_ROLE) {
      const url = request.nextUrl.clone();
      url.pathname = '/login/association';
      url.search = '';
      url.searchParams.set('next', pathname);
      if (needsAuth) {
        return NextResponse.redirect(url);
      }
      url.searchParams.set('reason', 'role');
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
};

export const config = {
  matcher: ['/clinic/:path*', '/association/:path*'],
};
