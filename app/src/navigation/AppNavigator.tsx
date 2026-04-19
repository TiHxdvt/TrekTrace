/**
 * 应用主导航器
 * 使用浮空导航栏代替系统底部 Tab
 * Tab 切换时活跃指示器滑动动画（native driver translateY）
 */

import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from '@react-native-community/blur';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { LoginScreen } from '../screens/LoginScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { MainTabParamList } from './types';
import { storageService, authServiceEvents } from '../services/storageService';
import { websocketService } from '../services/websocketService';
import { initDatabase } from '../database';
import { syncOnAppStart } from '../services/chatSyncService';
import { SHADOWS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import {
  IconMapPoint,
  IconPlane,
  IconChart,
  IconChatRoundLine,
} from '../components/SolarIcons';

// 浮空导航栏配置
const TAB_CONFIG = [
  { name: 'ActivityTab' as const, Icon: IconMapPoint },
  { name: 'HistoryTab' as const, Icon: IconPlane },
  { name: 'StatsTab' as const, Icon: IconChart },
  { name: 'MessagesTab' as const, Icon: IconChatRoundLine },
];

const TAB_COUNT = TAB_CONFIG.length;
const BUTTON_SIZE = 48;
const BAR_PADDING = 8;

// 主 Tab 导航器
const MainTab = createBottomTabNavigator<MainTabParamList>();

// 自定义浮空 Tab Bar - 先动画再切换页面
const FloatingTabBar = ({ state, navigation, descriptors }: any) => {
  const { colors, isDarkMode } = useTheme();
  const buttonXs = useRef<number[]>([]);
  const indicatorTranslateX = useRef(new Animated.Value(0)).current;
  const layoutReady = useRef(false);
  // 点击触发的动画进行中时为 true，跳过 useEffect 的重复动画
  const pressAnimating = useRef(false);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    barOuter: {
      width: '85%',
      height: 64,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
      overflow: 'hidden',
      ...SHADOWS.LARGE,
    },
    indicator: {
      position: 'absolute',
      left: 0,
      top: 8,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      borderRadius: BUTTON_SIZE / 2,
      backgroundColor: colors.PRIMARY,
      shadowColor: colors.PRIMARY,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  }), [colors]);

  // 滑动指示器到指定 tab 的弹簧动画
  const animateIndicatorTo = useCallback((index: number, callback?: () => void) => {
    const targetX = buttonXs.current[index];
    if (targetX === undefined) { callback?.(); return; }

    Animated.spring(indicatorTranslateX, {
      toValue: targetX,
      useNativeDriver: true,
      overshootClamping: true,
      damping: 24,
      stiffness: 400,
    }).start(({ finished }) => {
      if (finished) callback?.();
    });
  }, [indicatorTranslateX]);

  // state.index 变化时（拖拽/外部触发），同步指示器
  useEffect(() => {
    if (pressAnimating.current) return; // 点击触发的，onPress 里已处理
    animateIndicatorTo(state.index);
  }, [state.index, animateIndicatorTo]);

  // 根据手指 X 坐标计算对应的 tab 索引
  const barLayoutRef = useRef({ x: 0, width: 0 });
  const calculateIndexFromX = (absoluteX: number) => {
    const { x, width } = barLayoutRef.current;
    const effectiveTabWidth = (width - BAR_PADDING * 2) / TAB_COUNT;
    const relativeX = absoluteX - x - BAR_PADDING;
    return Math.max(0, Math.min(TAB_COUNT - 1, Math.floor(relativeX / effectiveTabWidth)));
  };

  const navigateToTabAt = (absoluteX: number) => {
    const index = calculateIndexFromX(absoluteX);
    const targetRoute = state.routes[index];
    if (targetRoute && state.index !== index) {
      navigation.navigate(targetRoute.name);
    }
  };

  const panGesture = useMemo(() =>
    Gesture.Pan()
      .activeOffsetX([-10, 10])
      .onUpdate((event) => {
        navigateToTabAt(event.absoluteX);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.index, state.routes, navigation],
  );

  // Check if current tab wants to hide the bar
  const currentRoute = state.routes[state.index];
  const currentDescriptor = descriptors[currentRoute.key];
  const tabBarVisible = currentDescriptor?.options?.tabBarVisible !== false;

  if (!tabBarVisible) return null;

  return (
    <View style={floatingStyles.container}>
      <GestureDetector gesture={panGesture}>
        <View
          style={dynamicStyles.barOuter}
          collapsable={false}
          onLayout={(e) => {
            barLayoutRef.current = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
          }}
        >
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurRadius={20}
            overlayColor={colors.OVERLAY.NAV}
            blurType={isDarkMode ? 'dark' : 'light'}
            blurAmount={20}
          />
          <View style={floatingStyles.barContent}>
            {/* 滑动指示器：活跃 tab 的背景圆 */}
            <Animated.View
              style={[
                dynamicStyles.indicator,
                {
                  transform: [{ translateX: indicatorTranslateX }],
                },
              ]}
              pointerEvents="none"
            />

            {state.routes.map((route: any, index: number) => {
              const isFocused = state.index === index;
              const config = TAB_CONFIG.find(t => t.name === route.name);
              if (!config) return null;

              const onPress = () => {
                if (isFocused) return;
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (event.defaultPrevented) return;

                // 先动画指示器，完成后再切换页面
                // 重置 pressAnimating 防止快速连击时卡死
                pressAnimating.current = true;
                animateIndicatorTo(index, () => {
                  pressAnimating.current = false;
                  navigation.navigate(route.name);
                });
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  activeOpacity={0.7}
                  style={floatingStyles.button}
                  onLayout={(e) => {
                    buttonXs.current[index] = e.nativeEvent.layout.x;
                    // 用 !== undefined 避免 x=0 时被 filter(Boolean) 误排除
                    if (!layoutReady.current && buttonXs.current.filter(v => v !== undefined).length === TAB_COUNT) {
                      layoutReady.current = true;
                      indicatorTranslateX.setValue(buttonXs.current[state.index]);
                    }
                  }}
                >
                  <config.Icon
                    size={20}
                    color={isFocused ? '#ffffff' : colors.TEXT.TERTIARY}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </GestureDetector>
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
  barContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BAR_PADDING,
    height: 64,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const AppNavigator: React.FC = () => {
  const { colors } = useTheme();
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

  // Connect WebSocket when authenticated, disconnect on logout
  // Also init local DB and sync chat data on login
  React.useEffect(() => {
    if (isAuthenticated) {
      // Initialize local SQLite DB
      initDatabase().then(() => {
        // Sync chat data from server to local DB
        syncOnAppStart().catch(e => {
          console.warn('[AppNavigator] syncOnAppStart failed:', e);
        });
      }).catch(e => {
        console.warn('[AppNavigator] initDatabase failed:', e);
      });

      websocketService.connect();
    } else {
      websocketService.disconnect();
    }
  }, [isAuthenticated]);

  if (isAuthenticated === null) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.BACKGROUND }]}>
        <ActivityIndicator color={colors.PRIMARY} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen onLoginSuccess={checkAuthStatus} />
    );
  }

  return (
    <MainTab.Navigator
      // eslint-disable-next-line react/no-unstable-nested-components
      tabBar={props => <FloatingTabBar {...props} />}
      backBehavior="none"
      screenOptions={{
        headerShown: false,
      }}
    >
      <MainTab.Screen name="ActivityTab" component={ActivityScreen} />
      <MainTab.Screen name="HistoryTab" component={HistoryScreen} />
      <MainTab.Screen name="StatsTab" component={StatsScreen} />
      <MainTab.Screen name="MessagesTab" component={MessagesScreen} />
    </MainTab.Navigator>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
