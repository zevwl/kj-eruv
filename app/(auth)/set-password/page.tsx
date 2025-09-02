'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAuth, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { app } from '../../../firebase/client';
import Link from 'next/link';

function SetPasswordComponent() {
  const searchParams = useSearchParams();
  const auth = getAuth(app);

  const [oobCode, setOobCode] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const code = searchParams.get('oobCode');
    if (!code) {
      setError('Invalid or missing password reset code.');
      setIsLoading(false);
      return;
    }
    setOobCode(code);

    // Verify the code to ensure it's valid and get the user's email
    verifyPasswordResetCode(auth, code)
      .then((userEmail) => {
        setEmail(userEmail);
        setIsLoading(false);
      })
      .catch(() => {
        setError('The link is invalid or has expired. Please request a new one.');
        setIsLoading(false);
      });
  }, [searchParams, auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!oobCode) {
      setError('Missing action code. Cannot proceed.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // 1. Set the new password using the Firebase SDK
      await confirmPasswordReset(auth, oobCode, password);

      // 2. Call our backend to activate the user
      await fetch('/api/users/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      setSuccess(true);
    } catch (err) {
      setError('Failed to set password. The link may have expired.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center p-10">Verifying link...</div>;
  }

  if (success) {
    return (
      <div className="text-center p-10 bg-white rounded-lg shadow-md max-w-md mx-auto mt-20">
        <h2 className="text-2xl font-bold text-green-600">Password Set Successfully!</h2>
        <p className="mt-4 text-gray-700">Your account is now active. You can now log in with your new password.</p>
        <Link href="/login">
          <span className="mt-6 inline-block px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700">
            Go to Login
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">Create Your Password</h2>
        <p className="text-center text-sm text-gray-600">Setting password for: <strong>{email}</strong></p>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md"/>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
            {isLoading ? 'Saving...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Wrap with Suspense for useSearchParams hook
export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SetPasswordComponent />
    </Suspense>
  );
}
