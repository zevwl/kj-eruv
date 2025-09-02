import { NextResponse, type NextRequest } from 'next/server';
import { auth } from 'firebase-admin';
import { initAdmin, adminDb } from './firebase/admin';

export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  await initAdmin();
  const sessionCookie = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // Allow the session creation route to be accessed without a session cookie.
  if (pathname.startsWith('/api/auth/session')) {
    return NextResponse.next();
  }

  // Protect all other API routes.
  if (pathname.startsWith('/api/')) {
    if (!sessionCookie) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Logic for page routes remains the same.
  const isProtected = pathname.startsWith('/editor') || pathname.startsWith('/users');

  if (!sessionCookie) {
    if (isProtected) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  try {
    const decodedToken = await auth().verifySessionCookie(sessionCookie, true);

    if (!decodedToken.email) {
      throw new Error('No email in token');
    }
    const usersRef = adminDb.collection('users');
    const userQuery = await usersRef.where('email', '==', decodedToken.email).limit(1).get();

    if (userQuery.empty) {
      if (isProtected) {
        return NextResponse.redirect(new URL('/not-authorized', request.url));
      }
    }

    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/editor', request.url));
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }
}

export const config = {
  matcher: [
    '/editor/:path*',
    '/users/:path*',
    '/login',
    '/api/:path*',
    '/not-authorized'
  ],
};
