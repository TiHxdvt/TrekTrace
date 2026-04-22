/**
 * Mock GPS 模拟控制 hook (__DEV__ only)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapView } from 'react-native-amap3d';
import { trackRecordingService } from '../../services/trackRecordingService';
import { mockLocationService, SIM_PROFILES, StartPosition } from '../../services/mockLocationService';
import { Dialog } from '../../components/Dialog';
import type { RawLocationPoint } from '../../types';
import type { GpsStrength } from './constants';

interface UseMockGpsOptions {
  mapViewRef: React.RefObject<MapView | null>;
  latestLocation: React.MutableRefObject<{ latitude: number; longitude: number } | null>;
  hasMovedToLocation: React.MutableRefObject<boolean>;
  currentZoomRef: React.MutableRefObject<number>;
  isRecordingRef: React.MutableRefObject<boolean>;
  shouldFollowRef: React.MutableRefObject<boolean>;
  showSummaryRef: React.MutableRefObject<boolean>;
  setHasGps: (v: boolean) => void;
  setGpsStrength: (v: GpsStrength) => void;
  gpsStrengthRef: React.MutableRefObject<GpsStrength>;
}

export function useMockGps(options: UseMockGpsOptions) {
  const {
    mapViewRef,
    latestLocation,
    hasMovedToLocation,
    currentZoomRef,
    isRecordingRef,
    shouldFollowRef,
    showSummaryRef,
    setHasGps,
    setGpsStrength,
    gpsStrengthRef,
  } = options;

  const [isSimulating, setIsSimulating] = useState(false);
  const isSimulatingRef = useRef(false);

  useEffect(() => {
    isSimulatingRef.current = isSimulating;
  }, [isSimulating]);

  const startSim = useCallback(
    (profileKey: string, startPos: StartPosition | null) => {
      setIsSimulating(true);
      setHasGps(true);
      gpsStrengthRef.current = 'strong';
      setGpsStrength('strong');

      mockLocationService.start(profileKey, startPos, (point: RawLocationPoint) => {
        latestLocation.current = { latitude: point.latitude, longitude: point.longitude };

        if (!hasMovedToLocation.current) {
          hasMovedToLocation.current = true;
          mapViewRef.current?.moveCamera(
            { target: { latitude: point.latitude, longitude: point.longitude }, zoom: 16 },
            500,
          );
        }

        if (isRecordingRef.current) {
          trackRecordingService.processLocation(point);

          if (shouldFollowRef.current) {
            mapViewRef.current?.moveCamera(
              { target: { latitude: point.latitude, longitude: point.longitude }, zoom: currentZoomRef.current },
              300,
            );
          }
        } else if (!showSummaryRef.current) {
          mapViewRef.current?.moveCamera(
            { target: { latitude: point.latitude, longitude: point.longitude }, zoom: currentZoomRef.current },
            300,
          );
        }
      });
    },
    [mapViewRef, latestLocation, hasMovedToLocation, currentZoomRef, isRecordingRef, shouldFollowRef, showSummaryRef, setHasGps, setGpsStrength, gpsStrengthRef],
  );

  const handleStopSim = useCallback(() => {
    mockLocationService.stop();
    setIsSimulating(false);
  }, []);

  const handleStartSim = useCallback(() => {
    const profileKeys = Object.keys(SIM_PROFILES);
    const profileOptions = profileKeys.map(key => SIM_PROFILES[key].name);

    let startPos: StartPosition | null = null;
    if (latestLocation.current) {
      startPos = latestLocation.current;
    }

    Dialog.show(
      'GPS 模拟',
      startPos
        ? `从当前位置开始 (${startPos.latitude.toFixed(4)}, ${startPos.longitude.toFixed(4)})`
        : '未获取到位置，将使用默认坐标',
      [
        ...profileOptions.map((name, idx) => ({
          text: name,
          onPress: () => startSim(profileKeys[idx], startPos),
        })),
        { text: '取消', style: 'cancel' },
      ],
    );
  }, [startSim, latestLocation]);

  const handleSimButton = useCallback(() => {
    if (isSimulating) {
      handleStopSim();
    } else {
      handleStartSim();
    }
  }, [isSimulating, handleStopSim, handleStartSim]);

  // Cleanup mock on unmount
  useEffect(() => {
    return () => {
      if (mockLocationService.isRunning) {
        mockLocationService.stop();
      }
    };
  }, []);

  return {
    isSimulating,
    isSimulatingRef,
    startSim,
    handleStopSim,
    handleSimButton,
  };
}
