/**
 * 应用主导航器
 * 使用浮空导航栏代替系统底部 Tab
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from '@react-native-community/blur';
import { LoginScreen } from '../screens/LoginScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AuthStackParamList, MainTabParamList } from './types';
import { storageService, authServiceEvents } from '../services/storageService';
import { COLORS, SHADOWS } from '../theme';
import {
  IconMapPoint,
  IconPlane,
  IconHeart,
  IconChatRoundLine,
} from '../components/SolarIcons';

// 认证栈导航器
const AuthStack = createStackNavigator<AuthStackParamList>();

// 主 Tab 导航器
const MainTab = createBottomTabNavigator<MainTabParamList>();

// 浮空导航栏配置
const TAB_CONFIG = [
  { name: 'ActivityTab' as const, Icon: IconMapPoint },
  { name: 'HistoryTab' as const, Icon: IconPlane },
  { name: 'StatsTab' as const, Icon: IconHeart },
  { name: 'ProfileTab' as const, Icon: IconChatRoundLine },
];

// 自定义浮空 Tab Bar - 使用 BlurView 实现 backdrop-blur-xl
const FloatingTabBar = ({ state, navigation }: any) => {
  return (
    <View style={floatingStyles.container}>
      {/* Bar with blur background */}
      <View style={floatingStyles.barOuter}>
        <BlurView
          style={StyleSheet.absoluteFillObject}
          blurRadius={20}
          overlayColor="rgba(24, 26, 34, 0.75)"
          blurType="dark"
          blurAmount={20}
        />
        <View style={floatingStyles.barContent}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;
            const config = TAB_CONFIG.find(t => t.name === route.name);
            if (!config) return null;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.7}
                style={[
                  floatingStyles.button,
                  isFocused && floatingStyles.buttonActive,
                ]}
              >
                <config.Icon
                  size={20}
                  color={isFocused ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {/* Home Indicator */}
      <View style={floatingStyles.homeIndicator} pointerEvents="none" />
    </View>
  );
};

const floatingStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  barOuter: {
    width: '85%',
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    ...SHADOWS.LARGE,
  },
  barContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 64,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: COLORS.PRIMARY,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: -20,
    left: '50%',
    transform: [{ translateX: -64 }],
    width: 128,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export const AppNavigator: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  const checkAuthStatus = async () => {
    const auth = await storageService.isAuthenticated();
    setIsAuthenticated(auth);
  };

  React.useEffect(() => {
    checkAuthStatus();
    const unsubscribe = authServiceEvents.subscribe(() => {
      checkAuthStatus();
    });
    return unsubscribe;
  }, []);

  if (isAuthenticated === null) {
    return (
      <Text style={styles.loading}>加载中...</Text>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen onLoginSuccess={checkAuthStatus} />
    );
  }

  return (
    <MainTab.Navigator
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <MainTab.Screen name="ActivityTab" component={ActivityScreen} />
      <MainTab.Screen name="HistoryTab" component={HistoryScreen} />
      <MainTab.Screen name="StatsTab" component={StatsScreen} />
      <MainTab.Screen name="ProfileTab" component={ProfileScreen} />
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
    backgroundColor: COLORS.BACKGROUND,
  },
});
