/**
 * ChatOverlay — 聊天页面覆盖层
 *
 * 与 DrawerOverlay 相同的模式：Animated.spring + useNativeDriver
 * 从右侧滑入全屏聊天页面，动画完全在原生 UI 线程驱动
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  View,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { ChatScreen } from '../screens/ChatScreen';
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

export type ChatOverlayParams = {
  conversationId: number;
  friendNickname?: string;
  friendAvatarUrl?: string;
  friendUserId: number;
  conversationType?: string;
  conversationName?: string;
};

// 模块级状态
let _animateOpen: ((params: ChatOverlayParams) => void) | null = null;
let _animateClose: ((cb?: () => void) => void) | null = null;

export const ChatOverlayRoot: React.FC = () => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [params, setParams] = useState<ChatOverlayParams | null>(null);
  const isOpenRef = useRef(false);
  const translateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const dynamicStyles = useMemo(() => StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.BACKGROUND,
      zIndex: 200,
    },
  }), [colors]);

  // 左边缘右滑关闭手势：仅作用于左侧窄条，不干扰内容区滚动
  const backGesture = useRef(
    Gesture.Pan()
      .activeOffsetX([10, 300])
      .failOffsetY([-20, 20])
      .onEnd((e) => {
        if (e.translationX > 50) {
          ChatOverlay.close();
        }
      }),
  ).current;

  useEffect(() => {
    ChatOverlay._animateOpen = (p: ChatOverlayParams) => {
      setParams(p);
      setVisible(true);
      isOpenRef.current = true;
      ChatOverlay.isOpen = true;
      Animated.spring(translateX, {
        toValue: 0,
        ...springConfig,
      }).start();
    };
    ChatOverlay._animateClose = (cb?: () => void) => {
      Animated.spring(translateX, {
        toValue: SCREEN_WIDTH,
        ...springConfig,
      }).start(({ finished }) => {
        if (finished) {
          isOpenRef.current = false;
          ChatOverlay.isOpen = false;
          setVisible(false);
          setParams(null);
          cb?.();
        }
      });
    };
  }, [translateX]);

  if (!visible || !params) return null;

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
      <ChatScreen
        navigation={{ goBack: () => ChatOverlay.close() } as any}
        route={{ params } as any}
      />
    </Animated.View>
  );
};

export const ChatOverlay = {
  isOpen: false,
  open(params: ChatOverlayParams) {
    this._animateOpen?.(params);
  },
  close(callback?: () => void) {
    this._animateClose?.(callback);
  },
  _animateOpen: (_params: ChatOverlayParams) => {},
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
