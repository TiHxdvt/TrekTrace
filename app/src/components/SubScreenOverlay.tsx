/**
 * SubScreenOverlay — 抽屉子页面通用覆盖层
 *
 * 与 DrawerOverlay / ChatOverlay 相同的模式：
 * Animated.spring + useNativeDriver，动画 100% 在原生 UI 线程驱动
 *
 * 用法：SubScreenOverlay.open('Profile') / SubScreenOverlay.close()
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  View,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NotificationScreen } from '../screens/NotificationScreen';
import { AccountPrivacyScreen } from '../screens/AccountPrivacyScreen';
import { DataManagementScreen } from '../screens/DataManagementScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { PermissionScreen } from '../screens/PermissionScreen';
import { useTheme } from '../contexts/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

// 与 DrawerOverlay 完全一致的弹簧参数
const springConfig = {
  damping: 28,
  stiffness: 350,
  mass: 0.8,
  overshootClamping: true,
  useNativeDriver: true,
} as const;

export type SubScreenName = 'Profile' | 'Notification' | 'AccountPrivacy' | 'DataManagement' | 'Friends' | 'Permission';

// 模块级状态
let _animateOpen: ((screen: SubScreenName) => void) | null = null;
let _animateClose: ((cb?: () => void) => void) | null = null;

const MOCK_NAV = { goBack: () => SubScreenOverlay.close() } as any;

export const SubScreenOverlayRoot: React.FC = () => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [screen, setScreen] = useState<SubScreenName | null>(null);
  const isOpenRef = useRef(false);
  const translateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const dynamicStyles = useMemo(() => StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.BACKGROUND,
      zIndex: 150,
    },
  }), [colors]);

  // 左边缘右滑关闭手势：仅作用于左侧窄条，不干扰内容区滚动
  const backGesture = useRef(
    Gesture.Pan()
      .activeOffsetX([10, 300])
      .failOffsetY([-20, 20])
      .onEnd((e) => {
        if (e.translationX > 50) {
          SubScreenOverlay.close();
        }
      }),
  ).current;

  useEffect(() => {
    SubScreenOverlay._animateOpen = (s: SubScreenName) => {
      setScreen(s);
      setVisible(true);
      isOpenRef.current = true;
      SubScreenOverlay.isOpen = true;
      Animated.spring(translateX, {
        toValue: 0,
        ...springConfig,
      }).start();
    };
    SubScreenOverlay._animateClose = (cb?: () => void) => {
      Animated.spring(translateX, {
        toValue: SCREEN_WIDTH,
        ...springConfig,
      }).start(({ finished }) => {
        if (finished) {
          isOpenRef.current = false;
          SubScreenOverlay.isOpen = false;
          setVisible(false);
          setScreen(null);
          cb?.();
        }
      });
    };
  }, [translateX]);

  if (!visible || !screen) return null;

  const renderScreen = () => {
    switch (screen) {
      case 'Profile':
        return <ProfileScreen navigation={MOCK_NAV} />;
      case 'Notification':
        return <NotificationScreen navigation={MOCK_NAV} />;
      case 'AccountPrivacy':
        return <AccountPrivacyScreen navigation={MOCK_NAV} />;
      case 'DataManagement':
        return <DataManagementScreen navigation={MOCK_NAV} />;
      case 'Friends':
        return <FriendsScreen navigation={MOCK_NAV} />;
      case 'Permission':
        return <PermissionScreen navigation={MOCK_NAV} />;
    }
  };

  return (
    <Animated.View
      style={[
        dynamicStyles.overlay,
        { transform: [{ translateX }] },
      ]}
      pointerEvents="auto"
    >
      <GestureDetector gesture={backGesture}>
        <View style={styles.edgeGestureArea} />
      </GestureDetector>
      {renderScreen()}
    </Animated.View>
  );
};

export const SubScreenOverlay = {
  isOpen: false,
  open(screen: SubScreenName) {
    this._animateOpen?.(screen);
  },
  close(callback?: () => void) {
    this._animateClose?.(callback);
  },
  _animateOpen: (_screen: SubScreenName) => {},
  _animateClose: (_cb?: () => void) => {},
};

const styles = StyleSheet.create({
  edgeGestureArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 25,
    zIndex: 10,
  },
});
