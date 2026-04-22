/**
 * 地图叠加按钮：GPS 状态指示、定位按钮、模拟按钮
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { IconCompass, IconGps } from '../../components/SolarIcons';
import { styles } from './styles';
import type { GpsStrength } from './constants';

interface MapOverlayButtonsProps {
  showSummary: boolean;
  hasGps: boolean;
  gpsStrength: GpsStrength;
  pulseAnim: Animated.Value;
  gpsColors: Record<GpsStrength, string>;
  isSimulating: boolean;
  colors: any;
  onLocate: () => void;
  onSimToggle: () => void;
}

export const MapOverlayButtons: React.FC<MapOverlayButtonsProps> = ({
  showSummary,
  hasGps,
  gpsStrength,
  pulseAnim,
  gpsColors,
  isSimulating,
  colors,
  onLocate,
  onSimToggle,
}) => {
  if (showSummary) return null;

  return (
    <>
      {/* GPS Status Indicator - 左上角 */}
      <TouchableOpacity
        style={[styles.mapGpsStatusWrapper, { borderWidth: 1, borderColor: colors.BORDER.MEDIUM }]}
        activeOpacity={0.7}
      >
        <BlurView
          style={StyleSheet.absoluteFillObject}
          blurRadius={12}
          overlayColor={colors.OVERLAY.HEAVY}
          blurType="dark"
          blurAmount={12}
          pointerEvents="none"
        />
        <Animated.View style={{ opacity: pulseAnim }}>
          <IconCompass size={18} color={gpsColors[gpsStrength]} />
        </Animated.View>
      </TouchableOpacity>

      {/* Mock GPS Button - 左下角 (__DEV__ only) */}
      {__DEV__ && (
        <TouchableOpacity
          style={[
            styles.mapSimWrapper,
            {
              backgroundColor: isSimulating ? colors.ERROR_OVERLAY.SIM_BG : colors.OVERLAY.GPS_SIM,
              borderWidth: 1,
              borderColor: isSimulating ? colors.ERROR_OVERLAY.SIM_BORDER : colors.BORDER.MEDIUM,
            },
          ]}
          onPress={onSimToggle}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.simText,
              { color: isSimulating ? colors.TEXT.PRIMARY : colors.TEXT.SECONDARY },
            ]}
          >
            SIM
          </Text>
        </TouchableOpacity>
      )}

      {/* Locate Button - 右下角 */}
      <TouchableOpacity
        style={[
          styles.mapLocateWrapper,
          { borderWidth: 1, borderColor: colors.BORDER.MEDIUM },
          !hasGps && styles.mapLocateDisabled,
        ]}
        onPress={onLocate}
        disabled={!hasGps}
      >
        <BlurView
          style={StyleSheet.absoluteFillObject}
          blurRadius={12}
          overlayColor={colors.OVERLAY.BLUR_LIGHT}
          blurType="dark"
          blurAmount={12}
          pointerEvents="none"
        />
        <IconGps size={18} color={hasGps ? colors.TEXT.SECONDARY : colors.TEXT.DISABLED} />
      </TouchableOpacity>
    </>
  );
};
