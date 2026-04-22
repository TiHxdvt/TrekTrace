/**
 * 天气图标 + 温度小组件
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY } from '../theme';

interface WeatherBadgeProps {
  condition: string;
  temperature: number;
  textColor: string;
}

export const WeatherBadge: React.FC<WeatherBadgeProps> = ({
  condition,
  temperature,
  textColor,
}) => {
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: textColor }]}>
        {condition} {temperature}°C
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '500',
  },
});
