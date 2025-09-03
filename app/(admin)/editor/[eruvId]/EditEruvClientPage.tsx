'use client';

import React from 'react';
import { doc, GeoPoint, Timestamp } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { db } from '@/firebase/client';
import EruvEditor from '@/components/EruvEditor';
import type { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions, WithFieldValue } from 'firebase/firestore';

// The Eruv type and converter remain the same
type Eruv = {
  id: string;
  name: string;
  inspector: string;
  certExpiration?: Timestamp | null;
  boundary: GeoPoint[];
  strokeColor: string;
  fillColor: string;
  fillOpacity: number;
};

const eruvConverter: FirestoreDataConverter<Eruv> = {
  toFirestore: (eruv: WithFieldValue<Eruv>): DocumentData => {
    const { id, ...data } = eruv;
    return data;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Eruv => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      name: data.name,
      inspector: data.inspector,
      certExpiration: data.certExpiration,
      boundary: data.boundary,
      strokeColor: data.strokeColor,
      fillColor: data.fillColor,
      fillOpacity: data.fillOpacity,
    };
  },
};

// This component now receives the eruvId as a simple string prop
export default function EditEruvClientPage({ eruvId }: { eruvId: string }) {
  const eruvRef = doc(db, 'eruvs', eruvId).withConverter(eruvConverter);
  const [eruv, loading, error] = useDocumentData(eruvRef);

  if (loading) {
    return (
      <div className="text-center py-10">
        <p>Loading eruv data...</p>
      </div>
    );
  }

  if (error || !eruv) {
    return (
      <div className="text-center py-10 text-red-500">
        <p>Error: Could not load eruv data. It may have been deleted.</p>
      </div>
    );
  }

  const eruvToEdit = {
    ...eruv,
    certExpiration: eruv.certExpiration && isFinite(+eruv.certExpiration)
      ? new Date(eruv.certExpiration.seconds * 1000).toISOString().split('T')[0]
      : '',
    boundary: eruv.boundary.map(gp => ({ lat: gp.latitude, lng: gp.longitude })),
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Edit Eruv: {eruv.name}</h2>
        <p className="text-gray-600">Adjust the boundary on the map or update the details below.</p>
      </div>
      <EruvEditor eruvToEdit={eruvToEdit} />
    </div>
  );
}
