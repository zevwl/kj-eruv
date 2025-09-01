'use client';

import React from 'react';
import GooglePlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-google-places-autocomplete';

// Defines the props that the AddressSearch component accepts, making it type-safe.
type AddressSearchProps = {
  onSelect: (lat: number, lng: number) => void;
  apiKey: string;
};

export default function AddressSearch({ onSelect, apiKey }: AddressSearchProps) {
  const handleSelect = async (place: { label: string; value: unknown } | null) => {
    if (!place) {
      return; // Handle case where the input is cleared
    }
    try {
      const results = await geocodeByAddress(place.label);
      const { lat, lng } = await getLatLng(results[0]);
      onSelect(lat, lng);
    } catch (error) {
      console.error('Error selecting address:', error);
    }
  };

  return (
    <GooglePlacesAutocomplete
      apiKey={apiKey}
      selectProps={{
        onChange: handleSelect,
        placeholder: 'Enter an address to check...',
        styles: {
          input: (provided) => ({
            ...provided,
            padding: '10px',
            borderRadius: '6px',
          }),
          option: (provided) => ({
            ...provided,
            padding: '10px',
          }),
        },
      }}
    />
  );
}
