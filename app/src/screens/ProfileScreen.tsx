/**
 * 个人中心页面
 */

import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button } from '../components/Button';
import { storageService } from '../services/storageService';

export const ProfileScreen: React.FC = () => {
  const handleLogout = () => {
    Alert.alert(
      '退出登录',
      '确定要退出登录吗？',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '确定',
          onPress: async () => {
            await storageService.clearAuthData();
            // 导航会自动重置到登录页
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>👤</Text>
        <Text style={styles.title}>个人中心</Text>
        <Text style={styles.subtitle}>管理你的账户</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>用户信息展示区域</Text>
          <Text style={styles.infoSubtext}>功能开发中...</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="退出登录"
            onPress={handleLogout}
            variant="outline"
          />
        </View>
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
    width: '100%',
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
    marginBottom: 30,
  },
  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
});
