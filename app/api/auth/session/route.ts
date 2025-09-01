import { NextResponse, type NextRequest } from 'next/server';
import { auth } from 'firebase-admin';
import { initAdmin, adminDb } from '../../../../firebase/admin';

// Explicitly setting the runtime for API routes that use Node.js-specific libraries.
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  await initAdmin();

  try {
    const { idToken } = await request.json();
    const decodedIdToken = await auth().verifyIdToken(idToken);

    if (!decodedIdToken.email) {
      return NextResponse.json({ error: 'Email not found in token' }, { status: 400 });
    }

    const usersRef = adminDb.collection('users');
    const userQuery = await usersRef.where('email', '==', decodedIdToken.email).limit(1).get();

    if (userQuery.empty) {
      console.warn(`Unauthorized sign-in attempt by: ${decodedIdToken.email}`);
      return NextResponse.json({ error: 'User not authorized' }, { status: 403 });
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await auth().createSessionCookie(idToken, { expiresIn });
    const options = {
      name: 'session',
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      // Set the secure flag to true only in production, allowing the cookie
      // to be set over HTTP during local development.
      secure: process.env.NODE_ENV === 'production',
    };

    const response = NextResponse.json({ status: 'success' }, { status: 200 });
    response.cookies.set(options);
    return response;

  } catch (error) {
    console.error('Session login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
