/**
 * 消息页面 - 会话列表
 * 显示所有聊天会话，支持实时新消息推送、滑动操作
 *
 * 本地优先架构：会话列表优先从本地 DB 读取，后台同步服务端数据
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Animated,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { IconChatRoundLine, IconCheckCircle, IconMagnifer } from '../components/SolarIcons';
import { ChatOverlay } from '../components/ChatOverlay';
import { Toast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { notificationService } from '../services/notificationService';
import { chatService } from '../services/chatService';
import { websocketService } from '../services/websocketService';
import * as chatDB from '../services/chatDatabaseService';
import { syncConversations } from '../services/chatSyncService';
import { Conversation, ChatMessage } from '../types';

const SWIPE_ACTIVE_OFFSET = 24;
const SWIPE_FAIL_OFFSET_Y = 16;

// ---- 时间格式化 ----

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hh}:${mm}`;

  // 同一天 → HH:mm
  if (isSameDay(date, now)) return timeStr;

  // 昨天
  const yesterday = new Date(now.getTime() - oneDayMs);
  if (isSameDay(date, yesterday)) return '昨天';

  // 一周内 → 星期X
  const diffDays = Math.floor(diffMs / oneDayMs);
  if (diffDays < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  }

  // 更早 → MM/DD
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date
    .getDate()
    .toString()
    .padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function truncateContent(content: string, maxLen = 30): string {
  if (content.length <= maxLen) return content;
  return content.substring(0, maxLen) + '...';
}

// ---- 滑动操作按钮 ----

const ActionButton: React.FC<{
  label: string;
  backgroundColor: string;
  onPress: () => void;
}> = ({ label, backgroundColor, onPress }) => (
  <TouchableOpacity
    style={[styles.actionButton, { backgroundColor }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={styles.actionText}>{label}</Text>
  </TouchableOpacity>
);

// ---- 主组件 ----

export const MessagesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSwipeableId, setOpenSwipeableId] = useState<number | null>(null);
  const swipeableRefs = useRef(new Map<number, Swipeable>());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Array<ChatMessage & { conversationId: number }>>([]);
  const [searching, setSearching] = useState(false);

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: { backgroundColor: colors.BACKGROUND },
        headerTitle: { color: colors.TEXT.PRIMARY },
        headerIconBtn: {
          backgroundColor: colors.OVERLAY.LIGHT,
          borderColor: colors.BORDER.LIGHT,
        },
        iconWrap: {
          backgroundColor: colors.OVERLAY.LIGHT,
          borderColor: colors.BORDER.LIGHT,
        },
        emptyTitle: { color: colors.TEXT.SECONDARY },
        emptySubtitle: { color: colors.TEXT.QUATERNARY },
        conversationName: { color: colors.TEXT.PRIMARY },
        conversationTime: { color: colors.TEXT.QUATERNARY },
        conversationPreview: { color: colors.TEXT.TERTIARY },
        unreadBadge: { backgroundColor: colors.PRIMARY },
        unreadBadgeText: { color: '#ffffff' },
        separator: { backgroundColor: colors.BORDER.LIGHT },
      }),
    [colors],
  );

  // ---- 从本地 DB 加载会话 ----
  const loadConversations = useCallback(async () => {
    try {
      const data = chatDB.getConversations();
      setConversations(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    // 后台同步会话列表
    syncConversations().then(() => loadConversations()).catch(() => {});

    // WebSocket 收到新消息 → upsert 本地 → 局部更新
    websocketService.subscribe('/user/queue/messages', (msg: any) => {
      try {
        // 更新对应会话的最后消息
        const convId = msg.conversationId;
        if (convId) {
          chatDB.updateConversationLastMessage(convId, msg.content, msg.createdAt);
          // 同时写入消息到本地
          if (!chatDB.messageExists(msg.id)) {
            chatDB.insertMessage(msg);
          }
        }
      } catch {
        // DB 操作失败不影响
      }
      // 重新从 DB 读取会话列表
      loadConversations();
    });

    return () => {
      websocketService.unsubscribe('/user/queue/messages');
    };
  }, [loadConversations]);

  // 每次页面获得焦点时重新从 DB 加载（处理从其他页面删除数据后返回的场景）
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  // ---- 全局搜索 ----
  const handleGlobalSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await chatService.searchAllMessages(keyword);
      setSearchResults(results);
    } catch {
      Toast.show('搜索失败');
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchResultPress = useCallback((msg: ChatMessage) => {
    setShowGlobalSearch(false);
    setSearchKeyword('');
    setSearchResults([]);
    // 打开对应会话
    const conv = conversations.find(c => c.id === msg.conversationId);
    ChatOverlay.open({
      conversationId: msg.conversationId,
      friendNickname: conv?.otherUser?.nickname,
      friendAvatarUrl: conv?.otherUser?.avatarUrl,
      friendUserId: conv?.otherUser?.userId ?? 0,
      conversationType: conv?.type,
      conversationName: conv?.name,
    });
  }, [conversations]);

  // ---- 全部已读 ----
  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      Toast.show('已全部标为已读');
      loadConversations();
    } catch {
      Toast.show('操作失败');
    }
  }, [loadConversations]);

  // ---- 点击会话 → 清除未读 + 打开聊天 ----
  const handleConversationPress = useCallback(
    async (item: Conversation) => {
      // 立即清除未读
      if (item.unreadCount > 0) {
        setConversations(prev =>
          prev.map(c => (c.id === item.id ? { ...c, unreadCount: 0 } : c)),
        );
        chatDB.updateConversationUnread(item.id, 0);
        chatService.markAsRead(item.id, 0).catch(() => {});
      }

      // 关闭已展开的滑动项
      const openPayload = {
        conversationId: item.id,
        friendNickname: item.otherUser?.nickname,
        friendAvatarUrl: item.otherUser?.avatarUrl,
        friendUserId: item.otherUser?.userId ?? 0,
        conversationType: item.type,
        conversationName: item.name,
      };
      if (openSwipeableId !== null) {
        closeSwipeable(openSwipeableId);
        setTimeout(() => {
          ChatOverlay.open(openPayload);
        }, 100);
      } else {
        ChatOverlay.open(openPayload);
      }
    },
    [openSwipeableId],
  );

  // ---- 滑动操作 ----
  const setSwipeableRef = useCallback((id: number, ref: Swipeable | null) => {
    if (ref) {
      swipeableRefs.current.set(id, ref);
    } else {
      swipeableRefs.current.delete(id);
    }
  }, []);

  const closeSwipeable = useCallback((id: number) => {
    swipeableRefs.current.get(id)?.close();
  }, []);

  // ---- 置顶/免打扰 ----
  const handleTogglePin = useCallback(
    async (id: number, isPinned: boolean) => {
      try {
        await chatService.setPinned(id, !isPinned);
        setConversations(prev =>
          prev.map(c => (c.id === id ? { ...c, isPinned: !isPinned } : c)),
        );
        const conv = conversations.find(c => c.id === id);
        if (conv) {
          chatDB.upsertConversation({ ...conv, isPinned: !isPinned });
        }
      } catch {
        Toast.show('操作失败');
      }
      closeSwipeable(id);
    },
    [closeSwipeable, conversations],
  );

  const handleToggleMute = useCallback(
    async (id: number, isMuted: boolean) => {
      try {
        await chatService.setMuted(id, !isMuted);
        setConversations(prev =>
          prev.map(c => (c.id === id ? { ...c, isMuted: !isMuted } : c)),
        );
        const conv = conversations.find(c => c.id === id);
        if (conv) {
          chatDB.upsertConversation({ ...conv, isMuted: !isMuted });
        }
      } catch {
        Toast.show('操作失败');
      }
      closeSwipeable(id);
    },
    [closeSwipeable, conversations],
  );

  const closeOpenSwipeable = useCallback(() => {
    if (openSwipeableId !== null) {
      closeSwipeable(openSwipeableId);
    }
  }, [closeSwipeable, openSwipeableId]);

  const handleToggleUnread = useCallback(
    async (id: number, hasUnread: boolean) => {
      try {
        if (hasUnread) {
          await chatService.markAsRead(id, 0);
        }
        chatDB.updateConversationUnread(id, hasUnread ? 0 : 1);
        setConversations(prev =>
          prev.map(c =>
            c.id === id ? { ...c, unreadCount: hasUnread ? 0 : 1 } : c,
          ),
        );
      } catch {
        // silently fail
      }
      closeSwipeable(id);
    },
    [closeSwipeable],
  );

  // ---- 删除会话：本地删除 + API ----
  const handleDelete = useCallback(
    (id: number) => {
      Alert.alert('确认删除', '删除后无法恢复，确定删除这条会话吗？', [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            // 本地 DB 删除
            chatDB.deleteConversationLocal(id);
            // 服务端删除
            chatService.deleteConversation(id).catch(() => {});
            // 更新 UI
            setConversations(prev => prev.filter(c => c.id !== id));
            closeSwipeable(id);
            // 清理 ref
            swipeableRefs.current.delete(id);
          },
        },
      ]);
    },
    [closeSwipeable],
  );

  // ---- 滑动操作按钮渲染 ----
  const renderRightActions = useCallback(
    (item: Conversation, progress: Animated.AnimatedInterpolation<number>) => {
      const hasUnread = item.unreadCount > 0;
      const isPinned = item.isPinned ?? false;
      const isMuted = item.isMuted ?? false;
      const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [320, 0],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View style={[styles.actionsWrapper, { transform: [{ translateX }] }]}>
          <View style={styles.actionsContainer}>
            <ActionButton
              label={isPinned ? '取消置顶' : '置顶'}
              backgroundColor={colors.WARNING || '#F59E0B'}
              onPress={() => handleTogglePin(item.id, isPinned)}
            />
            <ActionButton
              label={isMuted ? '取消免打扰' : '免打扰'}
              backgroundColor={colors.TEXT.TERTIARY || '#6B7280'}
              onPress={() => handleToggleMute(item.id, isMuted)}
            />
            <ActionButton
              label={hasUnread ? '标为已读' : '标为未读'}
              backgroundColor={colors.PRIMARY}
              onPress={() => handleToggleUnread(item.id, hasUnread)}
            />
            <ActionButton
              label="删除"
              backgroundColor={colors.ERROR}
              onPress={() => handleDelete(item.id)}
            />
          </View>
        </Animated.View>
      );
    },
    [colors, handleToggleUnread, handleDelete, handleTogglePin, handleToggleMute],
  );

  // ---- FlatList 渲染 ----
  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => (
      <Swipeable
        ref={ref => setSwipeableRef(item.id, ref)}
        renderRightActions={progress => renderRightActions(item, progress)}
        activeOffsetX={[-SWIPE_ACTIVE_OFFSET, SWIPE_ACTIVE_OFFSET]}
        failOffsetY={[-SWIPE_FAIL_OFFSET_Y, SWIPE_FAIL_OFFSET_Y]}
        overshootRight={false}
        onSwipeableOpen={() => {
          if (openSwipeableId !== null && openSwipeableId !== item.id) {
            closeSwipeable(openSwipeableId);
          }
          setOpenSwipeableId(item.id);
        }}
        onSwipeableClose={() => {
          if (openSwipeableId === item.id) {
            setOpenSwipeableId(null);
          }
        }}
      >
        <TouchableOpacity
          style={styles.conversationItem}
          onPress={() => handleConversationPress(item)}
          activeOpacity={0.7}
        >
          <Avatar uri={item.otherUser?.avatarUrl} size={44} />
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <View style={styles.conversationNameRow}>
                <Text
                  style={[styles.conversationName, dynamicStyles.conversationName]}
                  numberOfLines={1}
                >
                  {item.type === 'GROUP' ? (item.name || '群聊') : (item.otherUser?.nickname || '用户')}
                </Text>
                {item.isPinned && (
                  <View style={[styles.pinnedTag, { backgroundColor: colors.WARNING || '#F59E0B' }]}>
                    <Text style={styles.pinnedTagText}>置顶</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.conversationTime, dynamicStyles.conversationTime]}>
                {formatTime(item.lastMessage?.createdAt)}
              </Text>
            </View>
            <View style={styles.conversationFooter}>
              <Text
                style={[styles.conversationPreview, dynamicStyles.conversationPreview]}
                numberOfLines={1}
              >
                {item.lastMessage ? truncateContent(item.lastMessage.content) : '暂无消息'}
              </Text>
              {item.unreadCount > 0 && !(item.isMuted) && (
                <View style={[styles.unreadBadge, dynamicStyles.unreadBadge]}>
                  <Text style={[styles.unreadBadgeText, dynamicStyles.unreadBadgeText]}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    ),
    [
      dynamicStyles,
      handleConversationPress,
      openSwipeableId,
      closeSwipeable,
      setSwipeableRef,
      renderRightActions,
    ],
  );

  const renderSeparator = useCallback(
    () => <View style={[styles.separator, dynamicStyles.separator]} />,
    [dynamicStyles],
  );

  const keyExtractor = useCallback((item: Conversation) => String(item.id), []);

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.MD }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>消息</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerIconBtn, dynamicStyles.headerIconBtn]}
              onPress={handleMarkAllRead}
              activeOpacity={0.7}
            >
              <IconCheckCircle size={20} color={colors.TEXT.PRIMARY} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerIconBtn, dynamicStyles.headerIconBtn]}
              onPress={() => setShowGlobalSearch(true)}
              activeOpacity={0.7}
            >
              <IconMagnifer size={20} color={colors.TEXT.PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>
        {/* 全局搜索栏 */}
        {showGlobalSearch && (
          <View style={styles.searchBar}>
            <TextInput
              style={[styles.searchInput, { color: colors.TEXT.PRIMARY, backgroundColor: colors.OVERLAY.MEDIUM, borderColor: colors.BORDER.MEDIUM }]}
              value={searchKeyword}
              onChangeText={(text) => {
                setSearchKeyword(text);
                if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                searchTimerRef.current = setTimeout(() => handleGlobalSearch(text), 300);
              }}
              placeholder="搜索全部消息..."
              placeholderTextColor={colors.TEXT.PLACEHOLDER}
              autoFocus
            />
            <TouchableOpacity
              onPress={() => {
                setShowGlobalSearch(false);
                setSearchKeyword('');
                setSearchResults([]);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.searchCancel, { color: colors.PRIMARY }]}>取消</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      <TouchableWithoutFeedback onPress={closeOpenSwipeable} accessible={false}>
        <View style={styles.contentWrapper}>
          {showGlobalSearch && searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.searchResultItem, { borderBottomColor: colors.BORDER.LIGHT }]}
                  onPress={() => handleSearchResultPress(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.searchResultContent, { color: colors.TEXT.SECONDARY }]} numberOfLines={2}>
                    {item.content}
                  </Text>
                  <Text style={[styles.searchResultTime, { color: colors.TEXT.QUATERNARY }]}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : ''}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.listContent}
            />
          ) : showGlobalSearch && searching ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.PRIMARY} />
            </View>
          ) : loading || conversations.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.iconWrap, dynamicStyles.iconWrap]}>
                <IconChatRoundLine size={48} color={colors.TEXT.QUATERNARY} />
              </View>
              <Text style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>暂无消息</Text>
              <Text style={[styles.emptySubtitle, dynamicStyles.emptySubtitle]}>
                在好友页面点击"发消息"开始聊天
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              ItemSeparatorComponent={renderSeparator}
              contentContainerStyle={styles.listContent}
              refreshing={loading}
              onRefresh={() => {
                syncConversations().then(() => loadConversations()).catch(() => {});
              }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.XL,
    paddingBottom: SPACING.SM,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XXXL,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 120,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.XXL,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontWeight: '600',
    marginBottom: SPACING.SM,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
  },
  listContent: {
    paddingHorizontal: SPACING.LG,
    paddingBottom: 120,
  },
  // 会话项 — 无背景，紧凑
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    paddingVertical: SPACING.MD,
  },
  conversationContent: {
    flex: 1,
    gap: SPACING.XS,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '500',
    flex: 1,
    marginRight: SPACING.XS,
  },
  conversationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.SM,
  },
  pinnedTag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pinnedTagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  conversationTime: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
  },
  conversationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conversationPreview: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    flex: 1,
    marginRight: SPACING.SM,
  },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '600',
  },
  // 分隔线
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 44 + SPACING.MD, // 头像宽度 + gap，与文字对齐
  },
  // 滑动操作
  actionsWrapper: {
    height: '100%',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  actionButton: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#ffffff',
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '600',
  },
  // 搜索
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.SM,
    gap: SPACING.SM,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    borderRadius: BORDER_RADIUS.FULL,
    borderWidth: 1,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  searchCancel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
  },
  searchResultItem: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchResultContent: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
  },
  searchResultTime: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    marginTop: SPACING.XS,
  },
});
