/**
 * 通用按钮组件
 * 遵循玻璃拟态设计风格
 */

import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'outline';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const { colors } = useTheme();

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        // 主按钮（蓝色渐变）
        buttonPrimary: {
          backgroundColor: colors.PRIMARY,
          ...SHADOWS.PRIMARY,
        },

        // 次要按钮（半透明）
        buttonSecondary: {
          backgroundColor: colors.OVERLAY.LIGHT,
          borderWidth: 1,
          borderColor: colors.BORDER.LIGHT,
        },

        // 轮廓按钮
        buttonOutline: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.BORDER.HEAVY,
        },

        textPrimary: {
          color: '#ffffff',
        },
        textSecondary: {
          color: colors.TEXT.SECONDARY,
        },
      }),
    [colors],
  );

  const getButtonStyle = (): ViewStyle[] => {
    const baseStyle: ViewStyle[] = [styles.button, styles[`button_${size}`]];

    if (variant === 'primary') {
      baseStyle.push(dynamicStyles.buttonPrimary);
    } else if (variant === 'secondary') {
      baseStyle.push(dynamicStyles.buttonSecondary);
    } else if (variant === 'outline') {
      baseStyle.push(dynamicStyles.buttonOutline);
    }

    if (disabled || loading) {
      baseStyle.push(styles.buttonDisabled);
    }

    if (style) {
      baseStyle.push(style);
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle[] => {
    const baseStyle: TextStyle[] = [styles.text, styles[`text_${size}`]];

    if (variant === 'primary') {
      baseStyle.push(dynamicStyles.textPrimary);
    } else if (variant === 'secondary' || variant === 'outline') {
      baseStyle.push(dynamicStyles.textSecondary);
    }

    if (textStyle) {
      baseStyle.push(textStyle);
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#ffffff' : colors.PRIMARY}
          size="small"
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // 基础按钮样式
  button: {
    borderRadius: BORDER_RADIUS.LG,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  button_small: {
    paddingVertical: 8,
    paddingHorizontal: BORDER_RADIUS.LG,
    minHeight: 32,
  },
  button_medium: {
    paddingVertical: BORDER_RADIUS.MD,
    paddingHorizontal: 32,
    minHeight: 48,
  },
  button_large: {
    paddingVertical: BORDER_RADIUS.LG,
    paddingHorizontal: 40,
    minHeight: 56,
  },

  // 禁用状态
  buttonDisabled: {
    opacity: 0.5,
  },

  // 文本样式
  text: {
    fontWeight: '600',
  },
  text_small: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
  },
  text_medium: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
  },
  text_large: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
  },
});
