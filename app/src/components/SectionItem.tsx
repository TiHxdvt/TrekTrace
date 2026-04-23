/**
 * 通用菜单项组件
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TYPOGRAPHY, SPACING } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { IconAltArrowRight } from './SolarIcons';

interface SectionItemProps {
  title: string;
  value?: string;
  danger?: boolean;
  onPress: () => void;
}

export const SectionItem: React.FC<SectionItemProps> = ({ title, value, danger, onPress }) => {
  const { colors } = useTheme();

  const itemStyles = useMemo(() => StyleSheet.create({
    itemTitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.SECONDARY,
    },
    itemValue: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
    },
    dangerText: {
      color: colors.ERROR,
    },
  }), [colors]);

  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <Text style={[itemStyles.itemTitle, danger && itemStyles.dangerText]}>{title}</Text>
      <View style={styles.itemRight}>
        {value ? <Text style={[itemStyles.itemValue, danger && itemStyles.dangerText]}>{value}</Text> : null}
        <IconAltArrowRight size={18} color={danger ? colors.ERROR : colors.TEXT.QUINARY} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.LG,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },
});
