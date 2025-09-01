import Map from '@/components/Map';

export default function Home() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 font-bold">
            Google Maps API Key is not configured. Please check your .env.local file.
        </p>
      </div>
    );
  }

  return (
    <main className="w-screen h-screen">
        <Map apiKey={apiKey} />
    </main>
  );
}
