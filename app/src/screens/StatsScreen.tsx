/**
 * 数据统计页面
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const StatsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>📊</Text>
        <Text style={styles.title}>数据统计</Text>
        <Text style={styles.subtitle}>你的运动数据总览</Text>
        <Text style={styles.description}>
          总里程统计{'\n'}
          运动时长分析{'\n'}
          趋势图表展示
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
