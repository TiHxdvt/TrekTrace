/**
 * FeatureScreenLayout - 功能页面共享布局
 * 提供深色背景 + 安全区域 padding
 * 自动隐藏/恢复父级浮空导航栏
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS } from '../theme';

export const FeatureScreenLayout: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // 子页面获得焦点时隐藏浮空导航栏，失去焦点时恢复
  // 恢复操作延迟到转场动画结束后，避免在页面切换期间触发 FloatingTabBar 重渲染导致卡顿
  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({ tabBarVisible: false } as any);
      }
      return () => {
        InteractionManager.runAfterInteractions(() => {
          const parent = navigation.getParent();
          if (parent) {
            parent.setOptions({ tabBarVisible: true } as any);
          }
        });
      };
    }, [navigation]),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
});
