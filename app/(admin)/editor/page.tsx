'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, Timestamp, GeoPoint } from 'firebase/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { db } from '@/firebase/client';
import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue
} from 'firebase/firestore';

// Define the Eruv type for type safety
type Eruv = {
  id: string;
  name: string;
  inspector: string;
  certExpiration: Timestamp;
  boundary: GeoPoint[];
};

// Firestore converter for the Eruv type
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
    };
  },
};

const DeleteEruvModal: React.FC<{ eruv: Eruv, onClose: () => void, setFeedback: (msg: string, isError: boolean) => void }> = ({ eruv, onClose, setFeedback }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/eruv-list/${eruv.id}`, { method: 'DELETE' });
            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.error || 'Failed to delete eruv.');
            }
            setFeedback('Eruv deleted successfully.', false);
            onClose();
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError('Could not delete eruv. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md text-center">
                <h2 className="text-xl font-bold mb-4">Are you sure?</h2>
                <p className="text-gray-600 mb-6">This will permanently delete the eruv <strong className="text-gray-800">{eruv.name}</strong>. This action cannot be undone.</p>
                {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
                <div className="flex justify-center space-x-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button onClick={handleDelete} disabled={isLoading} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400">
                        {isLoading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};


export default function EditorDashboardPage() {
  const eruvsRef = collection(db, 'eruvs').withConverter(eruvConverter);
  const q = query(eruvsRef, orderBy('name'));
  const [eruvs, loading, error] = useCollectionData(q);
  const [deletingEruv, setDeletingEruv] = useState<Eruv | null>(null);
  const [feedback, setFeedbackState] = useState<{ message: string; isError: boolean } | null>(null);

  const setFeedback = (message: string, isError: boolean) => {
    setFeedbackState({ message, isError });
    setTimeout(() => setFeedbackState(null), 5000);
  };

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  return (
    <div>
      {deletingEruv && <DeleteEruvModal eruv={deletingEruv} onClose={() => setDeletingEruv(null)} setFeedback={setFeedback} />}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manage Eruvs</h2>
        <Link href="/editor/new">
          <span className="px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
            + Create New Eruv
          </span>
        </Link>
      </div>

      {feedback && (
        <div className={`p-3 my-4 text-sm rounded-lg ${feedback.isError ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100'}`}>
          {feedback.message}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eruv Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspector</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certification Expires</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && <tr><td colSpan={4} className="text-center py-4">Loading eruvs...</td></tr>}
            {error && <tr><td colSpan={4} className="text-center py-4 text-red-500">Error loading eruvs.</td></tr>}
            {eruvs && eruvs.map(eruv => (
              <tr key={eruv.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{eruv.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{eruv.inspector}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(eruv.certExpiration)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Link href={`/editor/${eruv.id}`}>
                    <span className="text-indigo-600 hover:text-indigo-900 cursor-pointer">Edit</span>
                  </Link>
                  <button onClick={() => setDeletingEruv(eruv)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
