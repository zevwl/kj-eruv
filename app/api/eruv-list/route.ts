import { NextResponse, type NextRequest } from 'next/server';
import { auth, firestore } from 'firebase-admin';
import { initAdmin, adminDb } from '../../../firebase/admin';

export const runtime = 'nodejs';

type NewEruvDataType = {
  name: string;
  boundary: firestore.GeoPoint[];
  createdAt: firestore.FieldValue;
  inspector?: string;
  certExpiration?: firestore.Timestamp;
  strokeColor?: string;
  fillColor?: string;
  fillOpacity?: number;
};

// Helper to check if the user is a logged-in editor or admin
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

export async function POST(request: NextRequest) {
  await initAdmin();
  const isAuthorized = await verifyEditor(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to create eruvs.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, inspector, certExpiration, boundary, strokeColor, fillColor, fillOpacity } = body;

    // Only name and boundary are now required.
    if (!name || !boundary || boundary.length < 3) {
      return NextResponse.json({ error: 'Missing or invalid fields. Eruv Name and a valid boundary are required.' }, { status: 400 });
    }

    const newEruvData: NewEruvDataType = {
      name,
      boundary: boundary.map((p: { lat: number, lng: number }) => new firestore.GeoPoint(p.lat, p.lng)),
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    if (inspector) {
      newEruvData.inspector = inspector;
    }

    if (certExpiration) {
      newEruvData.certExpiration = firestore.Timestamp.fromDate(new Date(certExpiration));
    }

    if (strokeColor) {
      newEruvData.strokeColor = strokeColor;
    }

    if (fillColor) {
      newEruvData.fillColor = fillColor;
    }

    if (fillOpacity) {
      newEruvData.fillOpacity = fillOpacity;
    }

    const docRef = await adminDb.collection('eruvs').add(newEruvData);

    return NextResponse.json({ success: true, id: docRef.id, message: 'Eruv created successfully.' }, { status: 201 });

  } catch (error) {
    console.error("Create eruv error:", error);
    return NextResponse.json({ error: 'Failed to create eruv. Please try again.' }, { status: 500 });
  }
}

