/**
 * Dialog 组件 - 玻璃拟态风格
 * 提供命令式 Dialog.show() API，替代 Alert.alert
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY, SPACING } from '../theme';

export interface DialogButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface DialogConfig {
  title: string;
  message: string;
  buttons: DialogButton[];
}

// Module-level state for imperative API
let showFn: ((config: DialogConfig) => void) | null = null;

const DEFAULT_BUTTON: DialogButton = { text: '确定', style: 'default' };

export const Dialog = {
  show(title: string, message: string, buttons?: DialogButton[]) {
    if (showFn) {
      showFn({
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : [DEFAULT_BUTTON],
      });
    } else if (__DEV__) {
      console.warn('Dialog.show() called before DialogRoot was mounted');
    }
  },
};

export const DialogRoot: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<DialogConfig>({
    title: '',
    message: '',
    buttons: [DEFAULT_BUTTON],
  });

  const handleShow = useCallback((newConfig: DialogConfig) => {
    setConfig(newConfig);
    setVisible(true);
  }, []);

  // Register on mount
  React.useEffect(() => {
    showFn = handleShow;
    return () => {
      showFn = null;
    };
  }, [handleShow]);

  const handleButtonPress = (button: DialogButton) => {
    setVisible(false);
    if (button.onPress) {
      setTimeout(button.onPress, 0);
    }
  };

  const handleBackdropPress = () => {
    // Only dismiss if there's a cancel button
    const cancelBtn = config.buttons.find(b => b.style === 'cancel');
    if (cancelBtn) {
      handleButtonPress(cancelBtn);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleBackdropPress}
    >
      <Pressable style={styles.overlay} onPress={handleBackdropPress}>
        <Pressable onPress={() => {}} style={styles.card}>
          {/* Title */}
          {config.title ? (
            <Text style={styles.title}>{config.title}</Text>
          ) : null}

          {/* Message */}
          {config.message ? (
            <Text style={styles.message}>{config.message}</Text>
          ) : null}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {config.buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'cancel' && styles.buttonCancel,
                  button.style === 'destructive' && styles.buttonDestructive,
                ]}
                onPress={() => handleButtonPress(button)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'cancel' && styles.buttonTextCancel,
                    button.style === 'destructive' && styles.buttonTextDestructive,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XXL,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: BORDER_RADIUS.G2.LG,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    padding: SPACING.XXL,
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  message: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.XXL,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.SM,
  },
  button: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.LG,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.PRIMARY,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
  },
  buttonDestructive: {
    backgroundColor: COLORS.ERROR_OVERLAY.BUTTON_BG,
    borderWidth: 1,
    borderColor: COLORS.ERROR_OVERLAY.BUTTON_BORDER,
  },
  buttonText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  buttonTextCancel: {
    color: COLORS.TEXT.TERTIARY,
  },
  buttonTextDestructive: {
    color: COLORS.ERROR,
  },
});
