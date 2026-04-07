/**
 * 历史记录页面
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const HistoryScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>📋</Text>
        <Text style={styles.title}>历史记录</Text>
        <Text style={styles.subtitle}>查看你的运动历史</Text>
        <Text style={styles.description}>
          查看所有运动记录{'\n'}
          按时间、类型筛选{'\n'}
          轨迹回放与详情
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
