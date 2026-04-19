/**
 * 语音消息气泡组件
 * 显示播放按钮、波形条、时长
 */

import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { IconPlay, IconPause } from '../SolarIcons';
import { Toast } from '../Toast';

interface ChatAudioMessageProps {
  mediaUrl: string;
  isMine: boolean;
  duration?: number;
  status?: string;
}

export const ChatAudioMessage: React.FC<ChatAudioMessageProps> = memo(({
  mediaUrl,
  isMine,
  duration,
  status,
}) => {
  const { colors } = useTheme();
  const [playing] = useState(false);
  const [currentTime] = useState(0);

  const handlePlayPause = useCallback(async () => {
    Toast.show('录音功能暂不可用');
  }, []);

  const displayDuration = playing ? currentTime : (duration || 0);
  const minutes = Math.floor(displayDuration / 60);
  const seconds = displayDuration % 60;
  const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // 波形条（确定性，不依赖 random）
  const bars = React.useMemo(() => {
    const seed = [3, 7, 2, 8, 5, 1, 9, 4, 6, 2, 7, 3, 8, 1, 5, 9, 4, 6, 2, 7];
    const progress = duration ? currentTime / duration : 0;
    return seed.map((s, i) => {
      const isPlayed = i / 20 < progress;
      const h = 8 + Math.sin(i * 0.8) * 12 + (s % 6);
      return { height: Math.max(6, h), isPlayed };
    });
  }, [duration, currentTime]);

  const bubbleBg = isMine ? colors.PRIMARY : colors.OVERLAY.MEDIUM;
  const textColor = isMine ? '#ffffff' : colors.TEXT.SECONDARY;
  const barActiveColor = isMine ? 'rgba(255,255,255,0.9)' : colors.PRIMARY;
  const barInactiveColor = isMine ? 'rgba(255,255,255,0.3)' : colors.TEXT.TERTIARY;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bubbleBg },
        !isMine && { borderColor: colors.BORDER.MEDIUM, borderWidth: 1 },
      ]}
    >
      <TouchableOpacity onPress={handlePlayPause} style={styles.playBtn} disabled={status === 'sending'}>
        {status === 'sending' ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : playing ? (
          <IconPause size={20} color={textColor} />
        ) : (
          <IconPlay size={20} color={textColor} />
        )}
      </TouchableOpacity>

      <View style={styles.waveform}>
        {bars.map((bar, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: bar.height,
                backgroundColor: bar.isPlayed ? barActiveColor : barInactiveColor,
              },
            ]}
          />
        ))}
      </View>

      <Text style={[styles.duration, { color: textColor }]}>{durationStr}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.LG,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    minWidth: 160,
    maxWidth: 220,
  },
  playBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.SM,
  },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    gap: 2,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
  },
  duration: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    marginLeft: SPACING.SM,
    minWidth: 30,
    textAlign: 'right',
  },
});
