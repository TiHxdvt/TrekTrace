/**
 * 消息页面 - 占位页
 * 玻璃拟态风格，后续实现聊天功能
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY, SPACING } from '../theme';
import { IconChatRoundDots } from '../components/SolarIcons';

export const MessagesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Background Glow */}
      <View style={styles.ambientGlow} pointerEvents="none">
        <View style={styles.glowOrb} />
      </View>

      {/* 全屏模糊层 */}
      <View style={styles.fullScreenBlur} pointerEvents="none">
        <BlurView
          style={StyleSheet.absoluteFillObject}
          blurRadius={20}
          overlayColor={COLORS.OVERLAY.BLUR_DARK}
          blurType="dark"
          blurAmount={20}
        />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>消息</Text>
      </View>

      {/* Empty State */}
      <View style={styles.emptyState}>
        <View style={styles.iconWrap}>
          <IconChatRoundDots size={48} color={COLORS.TEXT.QUATERNARY} />
        </View>
        <Text style={styles.emptyTitle}>暂无消息</Text>
        <Text style={styles.emptySubtitle}>开始运动后可以与同行好友交流</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowOrb: {
    position: 'absolute',
    top: -40,
    right: '20%',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.GRADIENT.BLUE,
  },
  fullScreenBlur: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  header: {
    paddingHorizontal: SPACING.XL,
    paddingBottom: SPACING.XXL,
    zIndex: 20,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XXXL,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    letterSpacing: -0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingBottom: 120,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.XXL,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontWeight: '600',
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.SM,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.TEXT.QUATERNARY,
  },
});
