/**
 * 订阅 trackRecordingService 的 session/stats 状态
 * 以及崩溃恢复逻辑
 */

import { useState, useEffect, useRef } from 'react';
import { trackRecordingService } from '../../services/trackRecordingService';
import { backgroundLocationService } from '../../services/backgroundLocationService';
import { Dialog } from '../../components/Dialog';
import type { RecordingSession, RecordingStats } from '../../types';

export interface RecordingStateResult {
  session: RecordingSession | null;
  stats: RecordingStats;
  polylineSegments: Array<Array<{ latitude: number; longitude: number }>>;
  isIdle: boolean;
  isRecording: boolean;
  isPaused: boolean;
  showSummary: boolean;
  setShowSummary: (v: boolean) => void;
  lockedActivityType: React.MutableRefObject<string | null>;
}

export function useRecordingState(): RecordingStateResult {
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [stats, setStats] = useState<RecordingStats>({
    distance: 0,
    duration: 0,
    currentPace: 0,
    elevationGain: 0,
    currentSpeed: 0,
  });
  const [polylineSegments, setPolylineSegments] = useState<
    Array<Array<{ latitude: number; longitude: number }>>
  >([]);

  const [showSummary, setShowSummary] = useState(false);
  const showSummaryRef = useRef(false);
  const lockedActivityType = useRef<string | null>(null);

  // Subscribe to recording service
  useEffect(() => {
    const unsubscribe = trackRecordingService.subscribe((s, st) => {
      setSession(s);
      setStats(st);
      setPolylineSegments(trackRecordingService.getPolylineSegments());
    });
    return unsubscribe;
  }, []);

  // Crash recovery on mount
  useEffect(() => {
    const checkRecovery = async () => {
      const recovered = await trackRecordingService.recoverSession();
      if (recovered) {
        if (recovered.status === 'stopped') {
          lockedActivityType.current = recovered.activityType;
          showSummaryRef.current = true;
          setShowSummary(true);
        } else if (recovered.status === 'recording') {
          Dialog.show(
            '恢复记录',
            '检测到未完成的运动记录，是否恢复？',
            [
              {
                text: '丢弃',
                style: 'destructive',
                onPress: () => {
                  backgroundLocationService.stop();
                  trackRecordingService.discardRecording();
                },
              },
              {
                text: '恢复',
                style: 'default',
                onPress: () => {
                  backgroundLocationService.start(recovered.activityType).catch(() => {
                    // If permission denied, still resume recording
                  });
                },
              },
            ],
          );
        }
      }
    };
    checkRecovery();
  }, []);

  const isIdle = !session || session.status === 'idle' || session.status === 'stopped';
  const isRecording = session?.status === 'recording';
  const isPaused = session?.status === 'paused';

  return {
    session,
    stats,
    polylineSegments,
    isIdle,
    isRecording,
    isPaused,
    showSummary,
    setShowSummary,
    lockedActivityType,
  };
}
