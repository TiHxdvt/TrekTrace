/**
 * Toast 组件 - 底部居中自动消失提示
 * 提供命令式 Toast.show() API
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Keyboard,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, TYPOGRAPHY, SPACING, ANIMATION } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface ToastConfig {
  message: string;
  copyText?: string;
  duration?: number;
}

// Module-level state for imperative API
let showFn: ((config: ToastConfig) => void) | null = null;

export const Toast = {
  show(message: string, options?: { copyText?: string; duration?: number }) {
    if (showFn) {
      showFn({
        message,
        copyText: options?.copyText,
        duration: options?.duration,
      });
    } else if (__DEV__) {
      console.warn('Toast.show() called before ToastRoot was mounted');
    }
  },
};

export const ToastRoot: React.FC = () => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<ToastConfig>({ message: '' });
  const opacity = useRef(new Animated.Value(0));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const dynamicStyles = useMemo(() => StyleSheet.create({
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.BACKGROUND_LIGHT,
      borderRadius: BORDER_RADIUS.G2.LG,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
      paddingHorizontal: SPACING.LG,
      paddingVertical: SPACING.MD,
      maxWidth: 360,
    },
    message: {
      flexShrink: 1,
      fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
      color: colors.TEXT.SECONDARY,
      fontWeight: '500',
      lineHeight: 20,
    },
    copyButton: {
      marginLeft: SPACING.MD,
      paddingVertical: SPACING.XS,
      paddingHorizontal: SPACING.MD,
      backgroundColor: colors.PRIMARY,
      borderRadius: BORDER_RADIUS.MD,
    },
    copyText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: '#ffffff',
      fontWeight: '600',
    },
  }), [colors]);

  const hide = useCallback(() => {
    Animated.timing(opacity.current, {
      toValue: 0,
      duration: ANIMATION.NORMAL,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  }, []);

  const handleShow = useCallback((newConfig: ToastConfig) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setConfig(newConfig);
    setVisible(true);

    // Fade in
    opacity.current.setValue(0);
    Animated.timing(opacity.current, {
      toValue: 1,
      duration: ANIMATION.NORMAL,
      useNativeDriver: true,
    }).start();

    // Auto dismiss
    const duration = newConfig.duration ?? 5000;
    timerRef.current = setTimeout(hide, duration);
  }, [hide]);

  useEffect(() => {
    showFn = handleShow;
    return () => {
      showFn = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [handleShow]);

  const handleCopy = () => {
    if (config.copyText) {
      Clipboard.setString(config.copyText);
      hide();
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: insets.bottom + 60 },
        { opacity: opacity.current },
      ]}
      pointerEvents="box-none"
    >
      <View style={dynamicStyles.toast}>
        <Text style={dynamicStyles.message} numberOfLines={2}>
          {config.message}
        </Text>
        {config.copyText ? (
          <TouchableOpacity onPress={handleCopy} activeOpacity={0.7} style={dynamicStyles.copyButton}>
            <Text style={dynamicStyles.copyText}>复制</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING.XXL,
    zIndex: 9999,
    elevation: 9999,
  },
});
