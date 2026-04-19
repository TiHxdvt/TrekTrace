/**
 * 聊天附件选择面板
 * 底部弹出面板：拍照 / 相册 / 位置
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { IconMapPointBold, IconGps } from '../SolarIcons';

interface ChatAttachmentPanelProps {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  onLocation: () => void;
}

export const ChatAttachmentPanel: React.FC<ChatAttachmentPanelProps> = memo(({
  visible,
  onClose,
  onCamera,
  onGallery,
  onLocation,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={[styles.panel, { backgroundColor: colors.OVERLAY.HEAVY }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.TEXT.PRIMARY }]}>发送附件</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.OVERLAY.MEDIUM, borderColor: colors.BORDER.MEDIUM }]}
              onPress={onCamera}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>📷</Text>
              <Text style={[styles.actionText, { color: colors.TEXT.SECONDARY }]}>拍照</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.OVERLAY.MEDIUM, borderColor: colors.BORDER.MEDIUM }]}
              onPress={onGallery}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>🖼️</Text>
              <Text style={[styles.actionText, { color: colors.TEXT.SECONDARY }]}>相册</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.OVERLAY.MEDIUM, borderColor: colors.BORDER.MEDIUM }]}
              onPress={onLocation}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>📍</Text>
              <Text style={[styles.actionText, { color: colors.TEXT.SECONDARY }]}>位置</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    borderTopLeftRadius: BORDER_RADIUS.XXL,
    borderTopRightRadius: BORDER_RADIUS.XXL,
    paddingHorizontal: SPACING.XL,
    paddingTop: SPACING.SM,
    paddingBottom: SPACING.XXL,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
    marginBottom: SPACING.MD,
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
    marginBottom: SPACING.LG,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionBtn: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.LG,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: SPACING.XS,
  },
  actionText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
  },
});
