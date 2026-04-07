/**
 * 运动记录页面
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const ActivityScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🏃</Text>
        <Text style={styles.title}>运动记录</Text>
        <Text style={styles.subtitle}>开始记录你的户外运动</Text>
        <Text style={styles.description}>
          支持徒步、跑步、骑行三种模式{'\n'}
          实时GPS轨迹记录{'\n'}
          数据统计与分享
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1e26',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 40,
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 24,
  },
});
