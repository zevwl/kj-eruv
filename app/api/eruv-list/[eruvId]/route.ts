import { NextResponse, type NextRequest } from 'next/server';
import { auth, firestore } from 'firebase-admin';
import { initAdmin, adminDb } from '../../../../firebase/admin';

export const runtime = 'nodejs';

type UpdatedEruvDataType = {
  name: string;
  inspector: string;
  boundary: firestore.GeoPoint[];
  certExpiration: firestore.Timestamp | null;
};

async function verifyEditor(request: NextRequest): Promise<boolean> {
  const sessionCookie = request.cookies.get('session')?.value;
  if (!sessionCookie) return false;
  try {
    const decodedToken = await auth().verifySessionCookie(sessionCookie, true);
    if (!decodedToken.email) return false;
    const userQuery = await adminDb.collection('users').where('email', '==', decodedToken.email).limit(1).get();
    if (userQuery.empty) return false;
    const userRole = userQuery.docs[0].data().role;
    return userRole === 'admin' || userRole === 'editor';
  } catch {
    return false;
  }
}

// Handler for UPDATING an eruv
export async function PUT(request: NextRequest, { params }: { params: { eruvId: string } }) {
  await initAdmin();
  const isAuthorized = await verifyEditor(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { eruvId } = params;
    const body = await request.json();
    const { name, inspector, certExpiration, boundary } = body;

    if (!name || !boundary || boundary.length < 3) {
      return NextResponse.json({ error: 'Missing or invalid fields. Eruv Name and a valid boundary are required.' }, { status: 400 });
    }

    const updatedEruvData: UpdatedEruvDataType = {
      name,
      inspector: inspector || '', // Save empty string if inspector is cleared
      boundary: boundary.map((p: { lat: number, lng: number }) => new firestore.GeoPoint(p.lat, p.lng)),
      certExpiration: certExpiration ? firestore.Timestamp.fromDate(new Date(certExpiration)) : null, // Save null if date is cleared
    };

    await adminDb.collection('eruvs').doc(eruvId).update(updatedEruvData);

    return NextResponse.json({ success: true, message: 'Eruv updated successfully.' });
  } catch (error) {
    console.error("Update eruv error:", error);
    return NextResponse.json({ error: 'Failed to update eruv. Please try again.' }, { status: 500 });
  }
}

// Handler for DELETING an eruv
export async function DELETE(request: NextRequest, { params }: { params: { eruvId: string } }) {
  await initAdmin();
  const isAuthorized = await verifyEditor(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { eruvId } = params;
    await adminDb.collection('eruvs').doc(eruvId).delete();
    return NextResponse.json({ success: true, message: 'Eruv deleted successfully.' });
  } catch (error) {
    console.error("Delete eruv error:", error);
    return NextResponse.json({ error: 'Failed to delete eruv. Please try again.' }, { status: 500 });
  }
}

