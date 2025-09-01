import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore;

export const initAdmin = () => {
  if (admin.apps.length > 0) {
    if (!db) {
      db = admin.firestore();
    }
    return;
  }

  const serviceAccount: admin.ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  db = admin.firestore();
};

// Export the firestore instance
export { db as adminDb };

