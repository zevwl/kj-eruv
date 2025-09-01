'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  type WithFieldValue,
} from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '../../../firebase/client';

// Defines the structure of a user document, now including the ID.
type User = {
  id: string; // Document ID from Firestore (same as Firebase Auth UID)
  email: string;
  role: 'admin' | 'editor';
  status: 'active' | 'pending';
  lastLogin?: Timestamp;
  createdAt: Timestamp;
};

// Firestore data converter
const userConverter: FirestoreDataConverter<User> = {
  toFirestore(user: WithFieldValue<User>): DocumentData {
    // We destructure to remove the 'id' property, as it should not be stored
    // as a field within the Firestore document itself.
    const { id, ...data } = user;
    return data;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): User {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id, // Add the document ID to the object
      email: data.email,
      role: data.role,
      status: data.status,
      lastLogin: data.lastLogin,
      createdAt: data.createdAt,
    };
  },
};

// --- Components ---

const InviteUserModal: React.FC<{ onClose: () => void, setFeedback: (msg: string, isError: boolean) => void }> = ({ onClose, setFeedback }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null); // State for modal-specific error

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setModalError(null); // Clear previous errors

    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation.');
      }

      setFeedback(`Successfully sent an invitation to ${email}.`, false);
      onClose();
    } catch (error: unknown) {
      console.error("Invitation failed:", error);
      if (error instanceof Error) {
        setModalError(error.message); // Set modal error instead of calling parent feedback
      } else {
        setModalError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Invite New User</h2>
        <form onSubmit={handleInvite}>
          <p className="text-sm text-gray-600 mb-4">Enter the email of the user you wish to invite. They will receive an email with a link to set their password.</p>
          {modalError && <p className="text-sm text-red-600 mb-4 bg-red-50 p-3 rounded-md">{modalError}</p>}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
            required
          />
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300">
              {isLoading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- New Edit User Modal ---
const EditUserModal: React.FC<{ user: User, onClose: () => void, setFeedback: (msg: string, isError: boolean) => void }> = ({ user, onClose, setFeedback }) => {
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [isLoading, setIsLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null); // State for modal-specific error

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setModalError(null);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update user.');
      setFeedback('User updated successfully.', false);
      onClose();
    } catch (error: unknown) {
      if (error instanceof Error) setModalError(error.message);
      else setModalError('An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Edit User: {user.email}</h2>
        <form onSubmit={handleUpdate}>
          {modalError && <p className="text-sm text-red-600 mb-4 bg-red-50 p-3 rounded-md">{modalError}</p>}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as User['role'])} className="w-full mt-1 p-2 border border-gray-300 rounded-md">
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as User['status'])} className="w-full mt-1 p-2 border border-gray-300 rounded-md">
              <option value="active">Active</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300">
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- New Delete Confirmation Modal ---
const DeleteUserModal: React.FC<{ user: User, onClose: () => void, setFeedback: (msg: string, isError: boolean) => void }> = ({ user, onClose, setFeedback }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null); // State for modal-specific error

    const handleDelete = async () => {
        setIsLoading(true);
        setModalError(null);
        try {
            const response = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete user.');
            setFeedback('User deleted successfully.', false);
            onClose();
        } catch (error: unknown) {
            if (error instanceof Error) setModalError(error.message);
            else setModalError('An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md text-center">
                <h2 className="text-xl font-bold mb-4">Are you sure?</h2>
                <p className="text-gray-600 mb-6">This will permanently delete the user <strong className="text-gray-800">{user.email}</strong>. This action cannot be undone.</p>
                {modalError && <p className="text-sm text-red-600 mb-4 bg-red-50 p-3 rounded-md">{modalError}</p>}
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


// Main page component
export default function UsersPage() {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('email')).withConverter(userConverter);
  const [value, loading, error] = useCollection(q);

  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [feedback, setFeedbackState] = useState<{ message: string; isError: boolean } | null>(null);

  const setFeedback = (message: string, isError: boolean) => {
    setFeedbackState({ message, isError });
    setTimeout(() => setFeedbackState(null), 6000);
  };

  const users = value?.docs.map(doc => doc.data());

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  return (
    <div>
      {isInviteModalOpen && <InviteUserModal onClose={() => setInviteModalOpen(false)} setFeedback={setFeedback} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} setFeedback={setFeedback} />}
      {deletingUser && <DeleteUserModal user={deletingUser} onClose={() => setDeletingUser(null)} setFeedback={setFeedback} />}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manage Users</h2>
        <button onClick={() => setInviteModalOpen(true)} className="px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
          + Invite New User
        </button>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && <tr><td colSpan={5} className="text-center py-4">Loading users...</td></tr>}
            {error && <tr><td colSpan={5} className="text-center py-4 text-red-500">Error loading users.</td></tr>}

            {users && users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.lastLogin)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.status === 'active' ? 'bg-green-100 text-green-800' :
                    user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => setEditingUser(user)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                    <button onClick={() => setDeletingUser(user)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
