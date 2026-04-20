declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module '@react-native-community/geolocation' {
  interface GeoOptions {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  }
  interface GeoPosition {
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number;
      altitude: number | null;
      heading: number | null;
      speed: number | null;
    };
    timestamp: number;
  }
  type SuccessCallback = (position: GeoPosition) => void;
  type ErrorCallback = (error: { code: number; message: string }) => void;
  const Geolocation: {
    getCurrentPosition: (success: SuccessCallback, error?: ErrorCallback, options?: GeoOptions) => void;
  };
  export default Geolocation;
}
