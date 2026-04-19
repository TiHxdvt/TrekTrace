/**
 * 位置消息卡片组件
 * 显示坐标信息和位置描述
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { IconMapPointBold } from '../SolarIcons';

interface ChatLocationMessageProps {
  latitude: number;
  longitude: number;
  content?: string;
  isMine: boolean;
}

export const ChatLocationMessage: React.FC<ChatLocationMessageProps> = memo(({
  latitude,
  longitude,
  content,
  isMine,
}) => {
  const { colors } = useTheme();

  const handleOpenMap = () => {
    const sanitized = (content || '位置分享').replace(/\n/g, ' ').substring(0, 50);
    const url = `https://uri.amap.com/marker?position=${longitude},${latitude}&name=${encodeURIComponent(sanitized)}`;
    Linking.openURL(url).catch(() => {});
  };

  const bubbleBg = isMine ? colors.PRIMARY : colors.OVERLAY.MEDIUM;
  const textColor = isMine ? '#ffffff' : colors.TEXT.SECONDARY;
  const subTextColor = isMine ? 'rgba(255,255,255,0.7)' : colors.TEXT.TERTIARY;

  return (
    <TouchableOpacity
      onPress={handleOpenMap}
      activeOpacity={0.8}
      style={[
        styles.container,
        { backgroundColor: bubbleBg },
        !isMine && { borderColor: colors.BORDER.MEDIUM, borderWidth: 1 },
      ]}
    >
      <View style={styles.iconWrap}>
        <IconMapPointBold size={24} color={isMine ? '#ffffff' : colors.PRIMARY} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {content || '位置分享'}
        </Text>
        <Text style={[styles.coords, { color: subTextColor }]}>
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.LG,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    minWidth: 200,
    maxWidth: 260,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '500',
  },
  coords: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    marginTop: 2,
  },
});
