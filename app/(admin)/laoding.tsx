export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-t-indigo-600 border-gray-200 rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-gray-700">Verifying session...</p>
      </div>
    </div>
  );
}
