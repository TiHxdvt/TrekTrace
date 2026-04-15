/**
 * 消息页面 - 占位页
 * 玻璃拟态风格，后续实现聊天功能
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { IconChatRoundDots, IconCheckCircle, IconMagnifer } from '../components/SolarIcons';
import { Toast } from '../components/Toast';
import { notificationService } from '../services/notificationService';

export const MessagesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      Toast.show('已全部标为已读');
    } catch {
      Toast.show('操作失败');
    }
  }, []);

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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>消息</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleMarkAllRead}
              activeOpacity={0.7}
            >
              <IconCheckCircle size={20} color={COLORS.TEXT.PRIMARY} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => Toast.show('功能开发中')}
              activeOpacity={0.7}
            >
              <IconMagnifer size={20} color={COLORS.TEXT.PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>
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
    paddingBottom: SPACING.MD,
    zIndex: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
