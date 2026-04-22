/**
 * Summary 回放动画 hook
 */

import { useState, useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import { SUMMARY_REPLAY_DURATION } from './constants';

export function useSummaryReplay() {
  const [replayProgress, setReplayProgress] = useState(0);
  const replayAnimRef = useRef<Animated.Value | null>(null);
  const replayListenerRef = useRef<string | null>(null);

  const startSummaryReplay = useCallback(() => {
    if (replayListenerRef.current && replayAnimRef.current) {
      replayAnimRef.current.removeListener(replayListenerRef.current);
    }
    if (replayAnimRef.current) {
      replayAnimRef.current.stopAnimation();
    }

    setReplayProgress(0);
    const anim = new Animated.Value(0);
    replayAnimRef.current = anim;

    let lastUpdateTime = 0;
    const UPDATE_INTERVAL_MS = 100;

    replayListenerRef.current = anim.addListener(({ value }) => {
      const now = Date.now();
      if (now - lastUpdateTime >= UPDATE_INTERVAL_MS || value >= 1) {
        lastUpdateTime = now;
        setReplayProgress(value);
      }
    });

    Animated.timing(anim, {
      toValue: 1,
      duration: SUMMARY_REPLAY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setReplayProgress(1);
      if (replayListenerRef.current) {
        anim.removeListener(replayListenerRef.current);
        replayListenerRef.current = null;
      }
    });
  }, []);

  const stopSummaryReplay = useCallback((reset?: boolean) => {
    if (replayListenerRef.current && replayAnimRef.current) {
      replayAnimRef.current.removeListener(replayListenerRef.current);
      replayListenerRef.current = null;
    }
    if (replayAnimRef.current) {
      replayAnimRef.current.stopAnimation();
    }
    if (reset) setReplayProgress(1);
  }, []);

  return { replayProgress, startSummaryReplay, stopSummaryReplay };
}
