/**
 * 应用主导航器
 * 管理认证状态和底部 Tab 导航
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import { LoginScreen } from '../screens/LoginScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AuthStackParamList, MainTabParamList } from './types';
import { storageService } from '../services/storageService';

// 图标组件（简化版，实际项目中应使用 react-native-vector-icons）
const TabBarIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const icons: Record<string, string> = {
    activity: '🏃',
    history: '📋',
    stats: '📊',
    profile: '👤',
  };

  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>
      {icons[name]}
    </Text>
  );
};

// 认证栈导航器
const AuthStack = createStackNavigator<AuthStackParamList>();

// 主 Tab 导航器
const MainTab = createBottomTabNavigator<MainTabParamList>();

export const AppNavigator: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  // 检查认证状态
  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const auth = await storageService.isAuthenticated();
    setIsAuthenticated(auth);
  };

  // 显示加载状态
  if (isAuthenticated === null) {
    return (
      <Text style={styles.loading}>加载中...</Text>
    );
  }

  // 未认证 - 显示登录页
  if (!isAuthenticated) {
    return (
      <LoginScreen onLoginSuccess={checkAuthStatus} />
    );
  }

  // 已认证 - 显示主界面
  return (
    <MainTab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
        tabBarStyle: {
          backgroundColor: 'rgba(28, 30, 38, 0.9)',
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <MainTab.Screen
        name="ActivityTab"
        component={ActivityScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="activity" focused={focused} />
          ),
          tabBarLabel: () => <Text style={styles.tabLabel}>记录</Text>,
        }}
      />
      <MainTab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="history" focused={focused} />
          ),
          tabBarLabel: () => <Text style={styles.tabLabel}>历史</Text>,
        }}
      />
      <MainTab.Screen
        name="StatsTab"
        component={StatsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="stats" focused={focused} />
          ),
          tabBarLabel: () => <Text style={styles.tabLabel}>统计</Text>,
        }}
      />
      <MainTab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="profile" focused={focused} />
          ),
          tabBarLabel: () => <Text style={styles.tabLabel}>我的</Text>,
        }}
      />
    </MainTab.Navigator>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 16,
    color: '#fff',
  },
  tabBar: {
    backgroundColor: 'rgba(28, 30, 38, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 0,
    height: 60,
    paddingBottom: 8,
  },
  icon: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  iconFocused: {
    color: '#3b82f6',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
