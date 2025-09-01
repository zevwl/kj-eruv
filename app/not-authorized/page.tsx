import Link from 'next/link';

export default function NotAuthorizedPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full text-center p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="mt-4 text-gray-700">
          You have successfully signed in, but you are not authorized to access the admin portal.
        </p>
        <p className="mt-2 text-gray-600">
          Please contact the site administrator if you believe this is an error.
        </p>
        <Link href="/api/auth/logout">
          <span className="mt-6 inline-block px-5 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 cursor-pointer">
            Sign Out
          </span>
        </Link>
      </div>
    </div>
  );
}

