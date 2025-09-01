import React from 'react';
import EditEruvClientPage from './EditEruvClientPage';

// This is now a Server Component. It safely handles the params object.
export default function EditEruvPage({ params }: { params: { eruvId: string } }) {
  // It passes the eruvId as a simple prop to the client component.
  return <EditEruvClientPage eruvId={params.eruvId} />;
}
