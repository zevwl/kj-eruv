'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from '@googlemaps/js-api-loader';

type EruvData = {
  id: string;
  name: string;
  inspector: string;
  certExpiration: string;
  boundary: { lat: number, lng: number }[];
  strokeColor: string;
  fillColor: string;
  fillOpacity: number;
};

type EruvEditorProps = {
  eruvToEdit?: EruvData;
};

export default function EruvEditor({ eruvToEdit }: EruvEditorProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const shapeRef = useRef<google.maps.Polygon | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

  const [formState, setFormState] = useState({
    name: eruvToEdit?.name || '',
    inspector: eruvToEdit?.inspector || '',
    certExpiration: eruvToEdit?.certExpiration || '',
    strokeColor: eruvToEdit?.strokeColor || '#990000',
    fillColor: eruvToEdit?.fillColor || '#bce2ab',
    fillOpacity: eruvToEdit?.fillOpacity || 0.35,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
      version: 'weekly',
      libraries: ['drawing', 'geometry'],
    });

    loader.load().then(async (google) => {
      const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
      const { DrawingManager } = await google.maps.importLibrary("drawing") as google.maps.DrawingLibrary;
      const { Polygon } = google.maps;

      const map = new Map(mapRef.current as HTMLDivElement, {
        center: eruvToEdit?.boundary[0] || { lat: 41.320, lng: -74.175 },
        zoom: eruvToEdit ? 15 : 14,
      });

      const imageUrl = '/eruv-map.jpg';
      const imageBounds = {
        north: 41.41187283359051,
        south: 41.27217820408219,
        east: -74.10016518861615,
        west: -74.23687780196233,
      };
      const mapOverlay = new google.maps.GroundOverlay(imageUrl, imageBounds, { opacity: 0.7 });
      mapOverlay.setMap(map);

      // If we are editing, draw the existing polygon.
      if (eruvToEdit) {
        const existingPolygon = new Polygon({
          paths: eruvToEdit.boundary,
          fillColor: formState.fillColor,
          strokeColor: formState.strokeColor,
          fillOpacity: formState.fillOpacity,
          strokeWeight: 2,
          editable: true,
          zIndex: 1,
        });
        existingPolygon.setMap(map);
        shapeRef.current = existingPolygon;
      } else {
        // Otherwise, enable the drawing manager for creating a new polygon.
        const drawingManager = new DrawingManager({
          drawingMode: google.maps.drawing.OverlayType.POLYGON,
          drawingControl: true,
          drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
              google.maps.drawing.OverlayType.POLYGON,
            ],
          },
          polygonOptions: {
            fillColor: formState.fillColor,
            strokeColor: formState.strokeColor,
            fillOpacity: formState.fillOpacity,
            strokeWeight: 2,
            editable: true,
            zIndex: 1
          },
        });
        drawingManager.setMap(map);
        drawingManagerRef.current = drawingManager;

        google.maps.event.addListener(drawingManager, 'polygoncomplete', (polygon: google.maps.Polygon) => {
          if (shapeRef.current) {
            shapeRef.current.setMap(null);
          }
          shapeRef.current = polygon;
          drawingManager.setDrawingMode(null);
        });
      }
    }).catch((e) => {
      console.error("Failed to load map:", e);
      setError("Failed to load map. Please refresh the page.");
    });
  }, [eruvToEdit]);

  // This useEffect hook listens for color changes and updates the map in real-time.
  useEffect(() => {
    const newOptions = {
      strokeColor: formState.strokeColor,
      fillColor: formState.fillColor,
      fillOpacity: formState.fillOpacity,
    };

    if (shapeRef.current) {
      shapeRef.current.setOptions(newOptions);
    }

    if (drawingManagerRef.current) {
      drawingManagerRef.current.setOptions({ polygonOptions: newOptions });
    }
  }, [formState.strokeColor, formState.fillColor, formState.fillOpacity]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newValue = name === 'fillOpacity' ? parseFloat(value) : value;
    setFormState(prevState => ({ ...prevState, [name]: newValue }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!shapeRef.current) {
      setError('Please ensure an eruv boundary is drawn on the map.');
      return;
    }

    const path = shapeRef.current.getPath().getArray();
    const boundary = path.map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() }));

    if (boundary.length < 3) {
      setError('The drawn boundary is not a valid shape.');
      return;
    }

    setIsLoading(true);

    const isEditing = !!eruvToEdit;
    const url = isEditing ? `/api/eruv-list/${eruvToEdit.id}` : '/api/eruv-list';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formState, boundary }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save eruv.');
      }

      router.push('/editor');
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {error && <div className="p-3 my-4 text-sm rounded-lg text-red-700 bg-red-100">{error}</div>}
      <div ref={mapRef} style={{ height: '500px', width: '100%', marginBottom: '20px' }} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Eruv Name</label>
          <input type="text" name="name" id="name" required value={formState.name} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label htmlFor="inspector" className="block text-sm font-medium text-gray-700">Inspector</label>
          <input type="text" name="inspector" id="inspector" value={formState.inspector} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label htmlFor="certExpiration" className="block text-sm font-medium text-gray-700">Certification Expiration Date</label>
          <input type="date" name="certExpiration" id="certExpiration" value={formState.certExpiration} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label htmlFor="strokeColor" className="block text-sm font-medium text-gray-700">Border Color</label>
                <input type="color" name="strokeColor" id="strokeColor" value={formState.strokeColor} onChange={handleInputChange} className="mt-1 h-10 w-full block border border-gray-300 rounded-md" />
            </div>
            <div>
                <label htmlFor="fillColor" className="block text-sm font-medium text-gray-700">Fill Color</label>
                <input type="color" name="fillColor" id="fillColor" value={formState.fillColor} onChange={handleInputChange} className="mt-1 h-10 w-full block border border-gray-300 rounded-md" />
            </div>
            <div>
                <label htmlFor="fillOpacity" className="block text-sm font-medium text-gray-700">Fill Opacity</label>
                <input type="range" name="fillOpacity" id="fillOpacity" min="0" max="1" step="0.01" value={formState.fillOpacity} onChange={handleInputChange} className="mt-1 w-full" />
            </div>
        </div>

        <div className="flex justify-end space-x-4">
            <button type="button" onClick={() => router.push('/editor')} className="px-6 py-2 font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                Cancel
            </button>
            <button type="submit" disabled={isLoading} className="px-6 py-2 font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-300">
                {isLoading ? 'Saving...' : (eruvToEdit ? 'Save Changes' : 'Save Eruv')}
            </button>
        </div>
      </form>
    </div>
  );
}
