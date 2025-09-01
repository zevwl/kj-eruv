import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    // Instruct the browser to clear the session cookie by setting its expiration to the past.
    const response = NextResponse.json({ success: true, message: "Logged out" });
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0), // Set expiry date to the past
      path: '/',
    });
    return response;
  } catch (error) {
    console.error("Logout Error:", error);
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 });
  }
}
