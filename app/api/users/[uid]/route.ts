import { NextResponse, type NextRequest } from 'next/server';
import { auth } from 'firebase-admin';
import { initAdmin, adminDb } from '../../../../firebase/admin';

export const runtime = 'nodejs';

// Helper function to verify admin privileges
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const sessionCookie = request.cookies.get('session')?.value;
  if (!sessionCookie) return false;
  try {
    const decodedToken = await auth().verifySessionCookie(sessionCookie, true);
    if (!decodedToken.email) return false;
    const userQuery = await adminDb.collection('users').where('email', '==', decodedToken.email).limit(1).get();
    if (userQuery.empty) return false;
    return userQuery.docs[0].data().role === 'admin';
  } catch {
    return false;
  }
}

// --- Handler for UPDATING a user ---
export async function PUT(request: NextRequest, context: { params: Promise<{ uid: string }> }) {
  await initAdmin();
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { uid } = await context.params; // Await the promise to get the params
    const { role, status } = await request.json();

    if (!role || !status) {
      return NextResponse.json({ error: 'Role and status are required' }, { status: 400 });
    }

    await adminDb.collection('users').doc(uid).update({ role, status });

    return NextResponse.json({ success: true, message: 'User updated successfully.' });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: 'Failed to update user. Please try again.' }, { status: 500 });
  }
}

// --- Handler for DELETING a user ---
export async function DELETE(request: NextRequest, context: { params: Promise<{ uid: string }> }) {
  await initAdmin();
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { uid } = await context.params; // Await the promise to get the params

    // Critical: Delete from Auth first, then from Firestore.
    await auth().deleteUser(uid);
    await adminDb.collection('users').doc(uid).delete();

    return NextResponse.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: 'Failed to delete user. Please try again.' }, { status: 500 });
  }
}
