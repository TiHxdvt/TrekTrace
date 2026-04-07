/**
 * 运动记录页面
 * 参考 /Users/ti/trektrace/resources/demo.html 的设计风格
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

export const ActivityScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>运动记录</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Map Area */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapIcon}>🗺️</Text>
            <Text style={styles.mapText}>地图区域</Text>
            <Text style={styles.mapSubtext}>GPS 轨迹将在此显示</Text>
          </View>
        </View>

        {/* Data Panel */}
        <View style={styles.dataPanel}>
          <View style={styles.dataRow}>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>距离</Text>
              <Text style={styles.dataValue}>0.00</Text>
              <Text style={styles.dataUnit}>公里</Text>
            </View>
            <View style={styles.dataDivider} />
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>时长</Text>
              <Text style={styles.dataValue}>00:00</Text>
              <Text style={styles.dataUnit}>时:分</Text>
            </View>
          </View>

          <View style={styles.dataRow}>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>配速</Text>
              <Text style={styles.dataValue}>--</Text>
              <Text style={styles.dataUnit}>分/公里</Text>
            </View>
            <View style={styles.dataDivider} />
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>海拔</Text>
              <Text style={styles.dataValue}>0</Text>
              <Text style={styles.dataUnit}>米</Text>
            </View>
          </View>
        </View>

        {/* Activity Type Selector */}
        <View style={styles.typeSelector}>
          <Text style={styles.sectionTitle}>选择运动类型</Text>
          <View style={styles.typeButtons}>
            <TouchableOpacity style={[styles.typeButton, styles.typeButtonActive]}>
              <Text style={styles.typeButtonIcon}>🏃</Text>
              <Text style={[styles.typeButtonText, styles.typeButtonTextActive]}>跑步</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.typeButton}>
              <Text style={styles.typeButtonIcon}>🚴</Text>
              <Text style={styles.typeButtonText}>骑行</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.typeButton}>
              <Text style={styles.typeButtonIcon}>🥾</Text>
              <Text style={styles.typeButtonText}>徒步</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Start Button */}
        <TouchableOpacity style={styles.startButton}>
          <Text style={styles.startButtonIcon}>▶️</Text>
          <Text style={styles.startButtonText}>开始运动</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1e26',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 20,
  },
  mapContainer: {
    marginHorizontal: 24,
    height: 280,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 24,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  mapText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  dataPanel: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dataItem: {
    flex: 1,
    alignItems: 'center',
  },
  dataDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  dataLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dataValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  dataUnit: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  typeSelector: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    borderColor: 'transparent',
  },
  typeButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  typeButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  startButton: {
    marginHorizontal: 24,
    height: 64,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  startButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
