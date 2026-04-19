/**
 * 全屏图片查看器
 * 单击关闭，全屏查看
 */

import React, { useCallback, memo } from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  GestureResponderEvent,
} from 'react-native';
import { SPACING } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ChatImageViewerProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
}

export const ChatImageViewer: React.FC<ChatImageViewerProps> = memo(({
  visible,
  imageUri,
  onClose,
}) => {
  const handleBackdropPress = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      hardwareAccelerated
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.touchArea}
          activeOpacity={1}
          onPress={handleBackdropPress}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchArea: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
});
