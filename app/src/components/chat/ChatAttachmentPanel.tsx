/**
 * 聊天附件选择 — 紧凑弹出列表
 * 点击 + 按钮后向上弹出小列表：拍照 / 相册 / 位置
 * 复用 StatsTypeFilter 的动画模式（maxHeight + opacity）
 */

import React, { memo, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { IconCamera, IconGallery, IconPointOnMap } from '../SolarIcons';

interface ChatAttachmentPanelProps {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  onLocation: () => void;
}

const ITEM_HEIGHT = 38;
const MAX_MENU_H = 3 * ITEM_HEIGHT;

const OPTIONS = [
  { key: 'camera' as const, Icon: IconCamera, label: '拍照' },
  { key: 'gallery' as const, Icon: IconGallery, label: '相册' },
  { key: 'location' as const, Icon: IconPointOnMap, label: '位置' },
];

export const ChatAttachmentPanel: React.FC<ChatAttachmentPanelProps> = memo(({
  visible,
  onClose,
  onCamera,
  onLocation,
  onGallery,
}) => {
  const { colors } = useTheme();
  const expandAnim = useRef(new Animated.Value(0)).current;
  const menuHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: visible ? 1 : 0,
      duration: ANIMATION.FAST,
      useNativeDriver: true,
    }).start();

    Animated.timing(menuHeight, {
      toValue: visible ? MAX_MENU_H : 0,
      duration: ANIMATION.FAST,
      useNativeDriver: false,
    }).start();
  }, [visible, expandAnim, menuHeight]);

  const contentOpacity = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const dynamicStyles = useMemo(() => StyleSheet.create({
    menu: {
      backgroundColor: colors.OVERLAY.SUMMARY,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
      borderRadius: BORDER_RADIUS.LG,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.XS,
      paddingVertical: SPACING.XS + 2,
      paddingLeft: SPACING.SM,
      paddingRight: SPACING.MD,
    },
    menuLabel: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      fontWeight: '500',
      color: colors.TEXT.SECONDARY,
    },
  }), [colors]);

  const handleSelect = useCallback((key: 'camera' | 'gallery' | 'location') => {
    onClose();
    const actions = { camera: onCamera, gallery: onGallery, location: onLocation };
    actions[key]();
  }, [onClose, onCamera, onGallery, onLocation]);

  return (
    <Animated.View
      style={[styles.container, { maxHeight: menuHeight }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Animated.View style={{ opacity: contentOpacity }}>
        <View style={dynamicStyles.menu}>
          {OPTIONS.map(opt => (
            <Pressable
              key={opt.key}
              style={dynamicStyles.menuItem}
              onPress={() => handleSelect(opt.key)}
            >
              <opt.Icon size={22} color={colors.TEXT.SECONDARY} />
              <Text style={dynamicStyles.menuLabel}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: '100%',
    left: SPACING.LG,
    marginBottom: SPACING.SM,
    overflow: 'hidden',
    zIndex: 50,
  },
});
