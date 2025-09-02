import { NextResponse, type NextRequest } from 'next/server';
import { initAdmin, adminDb } from '../../../../firebase/admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  await initAdmin();

  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    // Find the user by their email
    const userQuery = await adminDb.collection('users').where('email', '==', email).limit(1).get();

    if (userQuery.empty) {
      // This should ideally not happen if the invite process was followed
      console.warn(`Activation attempt for non-existent user: ${email}`);
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const userDocRef = userQuery.docs[0].ref;

    // Update their status to 'active'
    await userDocRef.update({
      status: 'active',
    });

    return NextResponse.json({ success: true, message: 'User activated successfully.' });
  } catch (error) {
    console.error("User activation error:", error);
    return NextResponse.json({ error: 'Failed to activate user.' }, { status: 500 });
  }
}
