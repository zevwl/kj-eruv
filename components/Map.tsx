'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { collection, query, onSnapshot, GeoPoint, Timestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User as AuthUser } from 'firebase/auth';
import { db, app } from '../firebase/client';
import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue
} from 'firebase/firestore';

const AddressSearch = dynamic(() => import('./AddressSearch'), {
  ssr: false,
});


// Define the Eruv type for type safety
type Eruv = {
  id: string;
  name: string;
  inspector: string;
  certExpiration?: Timestamp | null;
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

type MapProps = {
  apiKey: string;
};

export default function Map({ apiKey }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const eruvsDataRef = useRef<Eruv[]>([]);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const [google, setGoogle] = useState<typeof window.google | null>(null);
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mapLibraries, setMapLibraries] = useState<{
    maps: google.maps.MapsLibrary | null,
    marker: google.maps.MarkerLibrary | null,
    geometry: google.maps.GeometryLibrary | null
  }>({ maps: null, marker: null, geometry: null });

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user: AuthUser | null) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loader = new Loader({
      apiKey: apiKey,
      version: 'weekly',
      libraries: ['maps', 'marker', 'places', 'geometry'],
    });

    loader.load().then(async (google) => {
      if (!google) {
        console.error("Google Maps script failed to load. Check API key and network.");
        return;
      }
      setGoogle(google);
      const maps = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
      const marker = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      const geometry = await google.maps.importLibrary("geometry") as google.maps.GeometryLibrary;
      setMapLibraries({ maps, marker, geometry });

      if (mapRef.current) {
        const map = new maps.Map(mapRef.current, {
          center: { lat: 41.340984300308385, lng: -74.16804074639153 }, // 12 Garfield Rd
          zoom: 14,
        });
        mapInstanceRef.current = map;
      }
    }).catch(e => console.error("Map loading error:", e));

  }, [apiKey]);

  useEffect(() => {
    if (!google || !mapLibraries.maps || !mapInstanceRef.current) return;
    const { Polygon } = google.maps;

    const eruvsRef = collection(db, 'eruvs').withConverter(eruvConverter);
    const q = query(eruvsRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      polygonsRef.current.forEach(p => p.setMap(null));
      polygonsRef.current = [];
      eruvsDataRef.current = [];

      querySnapshot.forEach((doc) => {
        const eruv = doc.data();

        if (eruv.boundary && Array.isArray(eruv.boundary)) {
          const validPoints = eruv.boundary.filter(gp =>
            gp instanceof GeoPoint && typeof gp.latitude === 'number' && typeof gp.longitude === 'number'
          );

          if (validPoints.length >= 3) {
            eruvsDataRef.current.push(eruv);

            const paths = validPoints.map(gp => ({ lat: gp.latitude, lng: gp.longitude }));
            const polygon = new Polygon({
              paths: paths,
              strokeColor: '#FF0000',
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: '#FF0000',
              fillOpacity: 0.35,
            });

            polygon.setMap(mapInstanceRef.current);
            polygonsRef.current.push(polygon);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [google, mapLibraries.maps]);

  const handleAddressSelect = (lat: number, lng: number) => {
    if (!google || !mapLibraries.marker || !mapLibraries.geometry || !mapInstanceRef.current) return;
    const { LatLng } = google.maps;
    const { Marker } = mapLibraries.marker;
    const { poly } = mapLibraries.geometry;

    const location = new LatLng(lat, lng);
    mapInstanceRef.current.setCenter(location);
    mapInstanceRef.current.setZoom(17);

    if (markerRef.current) {
      markerRef.current.setMap(null);
    }
    markerRef.current = new Marker({
      position: location,
      map: mapInstanceRef.current,
    });

    let foundEruv: Eruv | null = null;
    for (let i = 0; i < polygonsRef.current.length; i++) {
      const polygon = polygonsRef.current[i];
      if (poly.containsLocation(location, polygon)) {
        foundEruv = eruvsDataRef.current[i];
        break;
      }
    }

    if (foundEruv) {
        setSearchResult(`This location is inside the "${foundEruv.name}" Eruv. Inspector: ${foundEruv.inspector}.`);
    } else {
        setSearchResult("This location is NOT within a known Eruv.");
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-10">
        <div className="bg-white p-2 rounded-lg shadow-lg">
          {google ? (
            <AddressSearch onSelect={handleAddressSelect} apiKey={apiKey} />
          ) : (
            <input
              className="w-full px-3 py-2 text-gray-500 border border-gray-300 rounded-md shadow-sm"
              placeholder="Loading search..."
              disabled
            />
          )}
          {searchResult && (
            <p className="p-2 mt-2 text-sm text-center text-gray-800 bg-gray-50 rounded-md">
              {searchResult}
            </p>
          )}
        </div>
      </div>
      {isLoggedIn && (
        <Link href="/editor">
          <span className="fixed bottom-4 right-4 z-20 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors cursor-pointer">
            Go to Editor
          </span>
        </Link>
      )}
    </div>
  );
}
