/**
 * 应用主导航器
 * 使用浮空导航栏代替系统底部 Tab
 */

import React, { useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from '@react-native-community/blur';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { LoginScreen } from '../screens/LoginScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MainTabParamList } from './types';
import { storageService, authServiceEvents } from '../services/storageService';
import { COLORS, SHADOWS } from '../theme';
import {
  IconMapPoint,
  IconPlane,
  IconHeart,
  IconChatRoundLine,
} from '../components/SolarIcons';

// 浮空导航栏配置
const TAB_CONFIG = [
  { name: 'ActivityTab' as const, Icon: IconMapPoint },
  { name: 'HistoryTab' as const, Icon: IconPlane },
  { name: 'StatsTab' as const, Icon: IconHeart },
  { name: 'ProfileTab' as const, Icon: IconChatRoundLine },
];

const TAB_COUNT = TAB_CONFIG.length;
const BAR_PADDING = 8;

// 主 Tab 导航器
const MainTab = createBottomTabNavigator<MainTabParamList>();

// 自定义浮空 Tab Bar - 使用 BlurView 实现 backdrop-blur-xl + 滑动切换
const FloatingTabBar = ({ state, navigation }: any) => {
  // 通过 onLayout 获取导航栏的实际位置，避免硬编码计算
  const barLayoutRef = useRef({ x: 0, width: 0 });

  // 根据手指 X 坐标计算对应的 tab 索引
  const calculateIndexFromX = (absoluteX: number) => {
    const { x, width } = barLayoutRef.current;
    const effectiveTabWidth = (width - BAR_PADDING * 2) / TAB_COUNT;
    const relativeX = absoluteX - x - BAR_PADDING;
    return Math.max(0, Math.min(TAB_COUNT - 1, Math.floor(relativeX / effectiveTabWidth)));
  };

  // 根据手指位置切换到对应 tab
  const navigateToTabAt = (absoluteX: number) => {
    const index = calculateIndexFromX(absoluteX);
    const targetRoute = state.routes[index];
    if (targetRoute && state.index !== index) {
      navigation.navigate(targetRoute.name);
    }
  };

  // 拖动手势：手指滑到哪个 tab 就选中哪个
  // 只在 onUpdate 中触发导航，避免与 TouchableOpacity 的 tap 事件冲突
  const panGesture = useMemo(() =>
    Gesture.Pan()
      .activeOffsetX([-10, 10])
      .onUpdate((event) => {
        navigateToTabAt(event.absoluteX);
      }),
    // navigateToTabAt 通过闭包引用 state/navigation，需要包含在依赖中
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.index, state.routes, navigation],
  );

  return (
    <View style={floatingStyles.container}>
      <GestureDetector gesture={panGesture}>
        <View
          style={floatingStyles.barOuter}
          collapsable={false}
          onLayout={(e) => {
            const { x, width } = e.nativeEvent.layout;
            barLayoutRef.current = { x, width };
          }}
        >
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurRadius={20}
            overlayColor={COLORS.OVERLAY.NAV}
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
                    color={isFocused ? COLORS.TEXT.PRIMARY : COLORS.TEXT.TERTIARY}
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
  barOuter: {
    width: '85%',
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
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
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.PRIMARY} />
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
    backgroundColor: COLORS.BACKGROUND,
  },
});
