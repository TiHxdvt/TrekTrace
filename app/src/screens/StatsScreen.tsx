/**
 * 数据统计页面
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { COLORS, BORDER_RADIUS } from '../theme';
import { IconGraphUp, IconBolt, IconFire } from '../components/SolarIcons';

export const StatsScreen: React.FC = () => {
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>数据统计</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.content}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statCardIcon}>
              <IconGraphUp size={24} color="#3b82f6" />
            </View>
            <Text style={styles.statCardValue}>0</Text>
            <Text style={styles.statCardLabel}>总里程 (km)</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statCardIcon}>
              <IconBolt size={24} color="#3b82f6" />
            </View>
            <Text style={styles.statCardValue}>0</Text>
            <Text style={styles.statCardLabel}>总时长 (h)</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statCardIcon}>
              <IconFire size={24} color="#3b82f6" />
            </View>
            <Text style={styles.statCardValue}>0</Text>
            <Text style={styles.statCardLabel}>总消耗 (kcal)</Text>
          </View>
        </View>

        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>趋势图表开发中...</Text>
        </View>
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
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  fullScreenBlur: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    zIndex: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 140,
    zIndex: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.XXL,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  statCardLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  placeholderCard: {
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.XXXL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.3)',
  },
});
