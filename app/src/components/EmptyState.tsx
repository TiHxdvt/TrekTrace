/**
 * 空状态组件
 * 用于无数据和错误状态提示
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY, BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle }) => {
  const { colors } = useTheme();

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        iconWrapper: {
          width: 56,
          height: 56,
          borderRadius: BORDER_RADIUS.LG,
          backgroundColor: colors.OVERLAY.LIGHT,
          borderWidth: 1,
          borderColor: colors.BORDER.LIGHT,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        },
        title: {
          fontSize: TYPOGRAPHY.FONT_SIZE.MD,
          fontWeight: '500',
          color: colors.TEXT.SECONDARY,
          textAlign: 'center',
          marginBottom: 4,
        },
        subtitle: {
          fontSize: TYPOGRAPHY.FONT_SIZE.SM,
          color: colors.TEXT.QUATERNARY,
          textAlign: 'center',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.container}>
      {icon && <View style={dynamicStyles.iconWrapper}>{icon}</View>}
      <Text style={dynamicStyles.title}>{title}</Text>
      {subtitle && <Text style={dynamicStyles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
});
