/**
 * 聊天消息气泡组件
 * 支持：发送状态 (sending/sent/failed/read)、长按菜单 (复制/删除/撤回)、消息时间
 * 支持多媒体类型：TEXT / IMAGE / AUDIO / LOCATION / RECALLED
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  Clipboard,
  Alert,
} from 'react-native';
import { LongPressGestureHandler, State, HandlerStateChangeEvent, LongPressGestureHandlerEventPayload } from 'react-native-gesture-handler';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar } from '../Avatar';
import { IconCheckRead, IconCloseCircle } from '../SolarIcons';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../theme';
import type { MessageStatus } from './chatDataTransform';
import { ChatImageMessage } from './ChatImageMessage';
import { ChatAudioMessage } from './ChatAudioMessage';
import { ChatLocationMessage } from './ChatLocationMessage';

interface ChatMessageItemProps {
  content: string;
  isMine: boolean;
  status?: MessageStatus;
  myAvatarUrl?: string;
  otherAvatarUrl?: string;
  onRetry?: () => void;
  onDelete?: () => void;
  onRecall?: () => void;
  mediaType?: string;
  mediaUrl?: string;
  mediaSize?: number;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
}

// ==================== 消息状态指示 ====================

const MessageStatusIcon: React.FC<{ status?: MessageStatus; onRetry?: () => void }> = ({
  status,
  onRetry,
}) => {
  switch (status) {
    case 'sending':
      return (
        <View style={styles.statusWrap}>
          <ActivityIndicator size="small" color="#888" />
        </View>
      );
    case 'failed':
      return (
        <TouchableOpacity style={styles.statusWrap} onPress={onRetry} hitSlop={8}>
          <IconCloseCircle size={16} color="#FF5252" />
        </TouchableOpacity>
      );
    case 'sent':
      return (
        <View style={styles.statusWrap}>
          <IconCheckRead size={16} color="#4CAF50" />
        </View>
      );
    case 'read':
      return (
        <View style={styles.statusWrap}>
          <IconCheckRead size={16} color="#3b82f6" />
        </View>
      );
    default:
      return <View style={styles.statusWrap} />;
  }
};

// ==================== 长按操作菜单 ====================

interface ActionMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  onCopy: () => void;
  onDelete?: () => void;
  onRecall?: () => void;
  onClose: () => void;
  isMine: boolean;
  canRecall?: boolean;
}

const ActionMenu: React.FC<ActionMenuProps> = ({
  visible,
  position,
  onCopy,
  onDelete,
  onRecall,
  onClose,
  isMine,
  canRecall,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  const bgColor = colors.OVERLAY.HEAVY;
  const borderColor = colors.BORDER.MEDIUM;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View
          style={[
            styles.menu,
            {
              top: position.y,
              left: position.x,
              backgroundColor: bgColor,
              borderColor,
            },
          ]}
        >
          <TouchableOpacity style={styles.menuItem} onPress={onCopy}>
            <Text style={[styles.menuItemText, { color: colors.TEXT.PRIMARY }]}>复制</Text>
          </TouchableOpacity>
          {isMine && canRecall && onRecall && (
            <TouchableOpacity style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: borderColor }]} onPress={onRecall}>
              <Text style={[styles.menuItemText, { color: colors.WARNING }]}>撤回</Text>
            </TouchableOpacity>
          )}
          {isMine && onDelete && (
            <TouchableOpacity style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: borderColor }]} onPress={onDelete}>
              <Text style={[styles.menuItemText, { color: colors.ERROR }]}>删除</Text>
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
    </Modal>
  );
};

// ==================== 主组件 ====================

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  content,
  isMine,
  status = 'sent',
  myAvatarUrl,
  otherAvatarUrl,
  onRetry,
  onDelete,
  onRecall,
  mediaType,
  mediaUrl,
  mediaSize,
  latitude,
  longitude,
  createdAt,
}) => {
  const { colors } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const itemRef = useRef<View>(null);

  // 是否可撤回（2 分钟内）
  const canRecall = useMemo(() => {
    if (!isMine || !createdAt) return false;
    const msgTime = new Date(createdAt).getTime();
    return Date.now() - msgTime < 2 * 60 * 1000;
  }, [isMine, createdAt]);

  // ---- 长按定位 ----
  const handleLongPress = useCallback(
    (event: HandlerStateChangeEvent<LongPressGestureHandlerEventPayload>) => {
      if (event.nativeEvent.state === State.ACTIVE) {
        itemRef.current?.measure((x, y, width, height, pageX, pageY) => {
          const menuWidth = 100;
          const menuX = isMine ? pageX - menuWidth - 10 : pageX + width + 10;
          setMenuPosition({
            x: Math.max(16, menuX),
            y: pageY - 10,
          });
          setMenuVisible(true);
        });
      }
    },
    [isMine],
  );

  // ---- 操作 ----
  const handleCopy = useCallback(() => {
    if (content) {
      Clipboard.setString(content);
      Alert.alert('提示', '已复制到剪贴板');
    }
    setMenuVisible(false);
  }, [content]);

  const handleDelete = useCallback(() => {
    setMenuVisible(false);
    Alert.alert('确认删除', '确定要删除这条消息吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => onDelete?.() },
    ]);
  }, [onDelete]);

  const handleRecall = useCallback(() => {
    setMenuVisible(false);
    Alert.alert('确认撤回', '确定要撤回这条消息吗？', [
      { text: '取消', style: 'cancel' },
      { text: '撤回', style: 'destructive', onPress: () => onRecall?.() },
    ]);
  }, [onRecall]);

  // ---- 撤回消息渲染 ----
  if (mediaType === 'RECALLED' || (!content && !mediaUrl && !latitude)) {
    // 检查 type 是否为 RECALLED
    return (
      <View style={[styles.row, styles.rowCenter]}>
        <Text style={[styles.recalledText, { color: colors.TEXT.QUATERNARY }]}>
          {isMine ? '你撤回了一条消息' : '对方撤回了一条消息'}
        </Text>
      </View>
    );
  }

  // ---- 气泡内容 ----
  const renderBubbleContent = () => {
    switch (mediaType) {
      case 'IMAGE':
        return mediaUrl ? (
          <ChatImageMessage mediaUrl={mediaUrl} isMine={isMine} status={status} />
        ) : null;
      case 'AUDIO':
        return mediaUrl ? (
          <ChatAudioMessage mediaUrl={mediaUrl} isMine={isMine} status={status} />
        ) : null;
      case 'LOCATION':
        return latitude != null && longitude != null ? (
          <ChatLocationMessage latitude={latitude} longitude={longitude} content={content} isMine={isMine} />
        ) : null;
      default:
        // 文本消息
        return (
          <View style={[styles.bubble, bubbleStyle, !isMine && styles.bubbleBorder]}>
            <Text style={[styles.messageText, { color: textColor }]}>{content}</Text>
          </View>
        );
    }
  };

  // ---- 气泡样式 ----
  const bubbleStyle = useMemo(() => {
    if (isMine) {
      return {
        backgroundColor: colors.PRIMARY,
        borderBottomRightRadius: 4,
      };
    }
    return {
      backgroundColor: colors.OVERLAY.MEDIUM,
      borderColor: colors.BORDER.MEDIUM,
      borderBottomLeftRadius: 4,
    };
  }, [isMine, colors]);

  const textColor = isMine ? '#ffffff' : colors.TEXT.SECONDARY;

  const bubbleContent = renderBubbleContent();

  if (!isMine) {
    return (
      <>
        <LongPressGestureHandler onHandlerStateChange={handleLongPress} minDurationMs={500}>
          <View style={[styles.row, styles.rowOther]} ref={itemRef}>
            <Avatar uri={otherAvatarUrl} size={32} />
            {bubbleContent}
          </View>
        </LongPressGestureHandler>
        <ActionMenu
          visible={menuVisible}
          position={menuPosition}
          onCopy={handleCopy}
          onDelete={undefined}
          onRecall={undefined}
          onClose={() => setMenuVisible(false)}
          isMine={false}
        />
      </>
    );
  }

  return (
    <>
      <LongPressGestureHandler onHandlerStateChange={handleLongPress} minDurationMs={500}>
        <View style={[styles.row, styles.rowMine]} ref={itemRef}>
          <MessageStatusIcon status={status} onRetry={onRetry} />
          {bubbleContent}
          <Avatar uri={myAvatarUrl} size={32} />
        </View>
      </LongPressGestureHandler>
      <ActionMenu
        visible={menuVisible}
        position={menuPosition}
        onCopy={handleCopy}
        onDelete={handleDelete}
        onRecall={canRecall ? handleRecall : undefined}
        onClose={() => setMenuVisible(false)}
        isMine
        canRecall={canRecall}
      />
    </>
  );
};

// ==================== 样式 ====================

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.XS,
  },
  rowMine: {
    justifyContent: 'flex-end',
    gap: SPACING.SM,
  },
  rowOther: {
    justifyContent: 'flex-start',
    gap: SPACING.SM,
  },
  rowCenter: {
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '65%',
    borderRadius: BORDER_RADIUS.LG,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  bubbleBorder: {
    borderWidth: 1,
  },
  messageText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    lineHeight: TYPOGRAPHY.FONT_SIZE.BASE * TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  recalledText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontStyle: 'italic',
    paddingVertical: SPACING.XS,
  },
  // 状态指示
  statusWrap: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  // 菜单
  modalOverlay: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    borderRadius: BORDER_RADIUS.LG,
    paddingVertical: 4,
    minWidth: 90,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
  },
  menuItemText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    textAlign: 'center',
  },
});
