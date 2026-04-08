/**
 * 历史记录页面
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, BORDER_RADIUS } from '../theme';
import { IconPlane, IconArrowRight } from '../components/SolarIcons';

export const HistoryScreen: React.FC = () => {
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
          overlayColor="rgba(28, 30, 38, 0.65)"
          blurType="dark"
          blurAmount={20}
        />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>历史记录</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Placeholder items */}
        {['最近一次跑步', '周末骑行', '山间徒步'].map((item, index) => (
          <View key={index} style={styles.historyCard}>
            <View style={styles.historyCardIcon}>
              <IconPlane size={20} color={COLORS.TEXT.SECONDARY} />
            </View>
            <View style={styles.historyCardContent}>
              <Text style={styles.historyCardTitle}>{item}</Text>
              <Text style={styles.historyCardSubtext}>暂无数据</Text>
            </View>
            <IconArrowRight size={16} color={COLORS.TEXT.QUINARY} />
          </View>
        ))}
      </ScrollView>
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
    top: -60,
    left: '30%',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.GRADIENT.PURPLE_LIGHT,
  },
  fullScreenBlur: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
    gap: 12,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    borderRadius: BORDER_RADIUS.XXL,
    padding: 16,
    gap: 16,
  },
  historyCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.OVERLAY.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyCardContent: {
    flex: 1,
  },
  historyCardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  historyCardSubtext: {
    fontSize: 12,
    color: COLORS.TEXT.QUATERNARY,
  },
});
