/**
 * 聊天消息气泡组件
 * 支持：发送状态 (sending/sent/failed/read)、长按菜单 (复制/删除/撤回)、消息时间
 * 支持多媒体类型：TEXT / IMAGE / AUDIO / LOCATION / RECALLED
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Dimensions,
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

const SCREEN_WIDTH = Dimensions.get('window').width;
const MENU_H = 36;
const ARROW_SIZE = 6;
const MENU_GAP = 6;

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

// ==================== 长按操作菜单（水平气泡条） ====================

interface MenuPosition {
  centerX: number;
  y: number;
  placement: 'above' | 'below';
}

interface ActionMenuProps {
  visible: boolean;
  position: MenuPosition;
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
  const [pillW, setPillW] = useState(0);

  // 关闭时重置宽度，避免 FlatList 回收复用导致定位偏差
  useEffect(() => {
    if (!visible) setPillW(0);
  }, [visible]);

  // 构建菜单项（关闭时直接跳过后续计算）
  const items = useMemo(() => {
    const list: { key: string; label: string; color: string; action: () => void }[] = [
      { key: 'copy', label: '复制', color: colors.TEXT.PRIMARY, action: onCopy },
    ];
    if (isMine && canRecall && onRecall) {
      list.push({ key: 'recall', label: '撤回', color: colors.WARNING, action: onRecall });
    }
    if (isMine && onDelete) {
      list.push({ key: 'delete', label: '删除', color: colors.ERROR, action: onDelete });
    }
    return list;
  }, [colors, isMine, canRecall, onCopy, onRecall, onDelete]);

  if (!visible) return null;

  const bgColor = colors.OVERLAY.HEAVY;
  const bColor = colors.BORDER.MEDIUM;

  // 定位：水平居中于 centerX，限制在屏幕内
  const estW = pillW || items.length * 64 + 16;
  const menuLeft = Math.max(12, Math.min(SCREEN_WIDTH - estW - 12, position.centerX - estW / 2));
  const arrowCenterX = Math.max(12, Math.min(estW - 12, position.centerX - menuLeft));

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.menuContainer, { top: position.y, left: menuLeft }]}>
          {/* 下方箭头（菜单在消息下方时，箭头朝上） */}
          {position.placement === 'below' && (
            <View
              style={[
                styles.arrowUp,
                { borderBottomColor: bgColor, marginLeft: arrowCenterX - ARROW_SIZE },
              ]}
            />
          )}
          {/* 水平气泡条 */}
          <View
            style={[styles.menuPill, { backgroundColor: bgColor, borderColor: bColor }]}
            onLayout={e => setPillW(e.nativeEvent.layout.width)}
          >
            {items.map((item, i) => (
              <React.Fragment key={item.key}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: bColor }]} />}
                <TouchableOpacity style={styles.menuItem} onPress={item.action}>
                  <Text style={[styles.menuItemText, { color: item.color }]}>{item.label}</Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
          {/* 上方箭头（菜单在消息上方时，箭头朝下） */}
          {position.placement === 'above' && (
            <View
              style={[
                styles.arrowDown,
                { borderTopColor: bgColor, marginLeft: arrowCenterX - ARROW_SIZE },
              ]}
            />
          )}
        </View>
      </Pressable>
    </Modal>
  );
};

// ==================== 主组件 ====================

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
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    centerX: 0,
    y: 0,
    placement: 'above',
  });
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
          const aboveY = pageY - MENU_H - ARROW_SIZE - MENU_GAP;
          const belowY = pageY + height + MENU_GAP;
          const placement: 'above' | 'below' = aboveY > 40 ? 'above' : 'below';
          const menuY = placement === 'above' ? aboveY : belowY;
          const centerX = pageX + width / 2;

          setMenuPosition({ centerX, y: menuY, placement });
          setMenuVisible(true);
        });
      }
    },
    [],
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

  // ---- 气泡内容 ----
  const isRecalled = mediaType === 'RECALLED' || (!content && !mediaUrl && !latitude);

  const renderBubbleContent = () => {
    if (isRecalled) {
      return (
        <View style={[styles.row, styles.rowCenter]}>
          <Text style={[styles.recalledText, { color: colors.TEXT.QUATERNARY }]}>
            {isMine ? '你撤回了一条消息' : '对方撤回了一条消息'}
          </Text>
        </View>
      );
    }

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

  // 撤回消息：居中，不显示头像和状态
  if (isRecalled) {
    return bubbleContent;
  }

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
  menuContainer: {
    position: 'absolute',
    alignItems: 'flex-start',
  },
  menuPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.FULL,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  menuItemText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '500',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
    alignSelf: 'center',
  },
  arrowUp: {
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: -1,
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderTopWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
