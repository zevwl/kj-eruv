'use client';

import React from 'react';
import NavLink from '@/components/NavLink';
import useAdminStatus from '@/hooks/useAdminStatus'; // Assuming this hook exists for checking admin role
import { useRouter } from 'next/navigation';

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAdmin, isLoading } = useAdminStatus();

  const handleLogout = async () => {
    // Call the logout API route
    await fetch('/api/auth/logout', { method: 'POST' });
    // Redirect to login page
    router.push('/login');
    router.refresh(); // Ensure server-side state is cleared
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
                <div className="flex">
                    <div className="flex-shrink-0 flex items-center">
                       <h1 className="text-xl font-bold text-gray-800">Eruv Management</h1>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:space-x-8 items-center">
                        <NavLink href="/editor">
                            Manage Eruv List
                        </NavLink>
                        {/* Conditionally render the User Management link if user is an admin */}
                        {!isLoading && isAdmin && (
                            <NavLink href="/users">
                                Manage Users
                            </NavLink>
                        )}
                    </div>
                </div>
                <div className="flex items-center">
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
      </nav>
      <main className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            {children}
        </div>
      </main>
    </div>
  );
}
