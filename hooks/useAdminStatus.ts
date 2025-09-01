'use client';

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { app, db } from '../firebase/client';

export default function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: AuthUser | null) => {
      if (user) {
        // User is signed in, now check their role in Firestore.
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          // Check if the user's role is 'admin'
          setIsAdmin(userData.role === 'admin');
        } else {
          // User document doesn't exist, so they can't be an admin.
          setIsAdmin(false);
        }
      } else {
        // User is signed out.
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth]);

  return { isAdmin, isLoading };
}
