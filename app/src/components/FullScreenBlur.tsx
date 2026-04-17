/**
 * 全屏模糊效果组件
 * 统一使用 BlurView 实现真实模糊
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../contexts/ThemeContext';

export const FullScreenBlur: React.FC = () => {
  const { colors, isDarkMode } = useTheme();

  return (
    <View style={styles.container} pointerEvents="none">
      <BlurView
        style={StyleSheet.absoluteFillObject}
        blurRadius={20}
        overlayColor={colors.OVERLAY.BLUR_DARK}
        blurType={isDarkMode ? 'dark' : 'light'}
        blurAmount={20}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});
