/**
 * FeatureHeader - 通用标题栏组件
 * 返回按钮 + 标题 + 可选右侧区域
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { TYPOGRAPHY, SPACING } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { IconAltArrowLeft } from './SolarIcons';

export const FeatureHeader: React.FC<{
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}> = ({ title, onBack, right }) => {
  const { colors } = useTheme();

  const dynamicStyles = useMemo(() => StyleSheet.create({
    title: {
      flex: 1,
      fontSize: TYPOGRAPHY.FONT_SIZE.XXL,
      fontWeight: '700',
      color: colors.TEXT.PRIMARY,
      marginLeft: SPACING.SM,
    },
  }), [colors]);

  return (
  <View style={styles.header}>
    <TouchableOpacity
      onPress={onBack}
      activeOpacity={0.7}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={styles.backBtn}
    >
      <IconAltArrowLeft size={24} color={colors.TEXT.SECONDARY} />
    </TouchableOpacity>
    <Text style={dynamicStyles.title}>{title}</Text>
    {right ? <View style={styles.rightArea}>{right}</View> : null}
  </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.XL,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -SPACING.SM,
  },
  rightArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
