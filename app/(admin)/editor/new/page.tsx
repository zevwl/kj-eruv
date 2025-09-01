import EruvEditor from '@/components/EruvEditor';

export default function NewEruvPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Create New Eruv</h2>
        <p className="text-gray-600">Use the map tools to draw the boundary and fill in the details below.</p>
      </div>
      <EruvEditor />
    </div>
  );
}
