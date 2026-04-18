/**
 * 聊天页面
 * 一对一文字聊天，支持实时消息接收、发送状态、时间标签
 * 延续 glassmorphism 设计风格
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { Toast } from '../components/Toast';
import { chatService } from '../services/chatService';
import { storageService } from '../services/storageService';
import { websocketService } from '../services/websocketService';
import { ChatMessage, User } from '../types';
import { IconAltArrowLeft } from '../components/SolarIcons';
import { ChatTimeItem } from '../components/chat/ChatTimeItem';
import { ChatMessageItem } from '../components/chat/ChatMessageItem';
import { ChatTypingItem } from '../components/chat/ChatTypingItem';
import {
  transformMessagesToList,
  ChatListItem,
  MessageStatus,
} from '../components/chat/chatDataTransform';

type NavProp = { goBack: () => void };

interface ChatScreenParams {
  conversationId: number;
  friendNickname?: string;
  friendAvatarUrl?: string;
  friendUserId: number;
}

export const ChatScreen: React.FC<{ navigation: NavProp; route: { params: ChatScreenParams } }> = ({
  navigation,
  route,
}) => {
  const { conversationId, friendNickname, friendAvatarUrl, friendUserId } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | undefined>();
  const [showTyping, setShowTyping] = useState(false);

  // 消息发送状态 Map: messageId → 'sending' | 'sent' | 'failed'
  const [statusMap, setStatusMap] = useState<Map<number, MessageStatus>>(new Map());

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 将消息数组变换为带时间标签的 FlatList 数据
  const listData = useMemo(
    () => transformMessagesToList(messages, statusMap),
    [messages, statusMap],
  );

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: { backgroundColor: colors.BACKGROUND },
        loadingContainer: { backgroundColor: colors.BACKGROUND },
        header: {
          backgroundColor: colors.OVERLAY.NAV,
          borderBottomColor: colors.BORDER.LIGHT,
        },
        backBtn: {
          backgroundColor: colors.OVERLAY.LIGHT,
          borderColor: colors.BORDER.LIGHT,
        },
        headerTitle: { color: colors.TEXT.PRIMARY },
        inputBar: {
          backgroundColor: colors.OVERLAY.NAV,
          borderTopColor: colors.BORDER.LIGHT,
        },
        inputContainer: {
          backgroundColor: colors.OVERLAY.MEDIUM,
          borderColor: colors.BORDER.MEDIUM,
        },
        textInput: {
          color: colors.TEXT.PRIMARY,
        },
        sendBtn: { backgroundColor: colors.PRIMARY },
        sendBtnDisabled: { backgroundColor: colors.TEXT.DISABLED },
        sendBtnText: { color: '#ffffff' },
        typingText: {
          color: colors.TEXT.QUATERNARY,
        },
      }),
    [colors],
  );

  // ---- 加载当前用户头像 ----
  useEffect(() => {
    storageService.getUser().then((user: User | null) => {
      if (user?.avatarUrl) setMyAvatarUrl(user.avatarUrl);
    });
  }, []);

  // ---- 加载消息 ----
  const loadMessages = useCallback(
    async (pageNum: number = 0) => {
      try {
        if (pageNum > 0) setLoadingMore(true);
        const res = await chatService.getMessages(conversationId, pageNum, 20);
        const newMessages = res.content.reverse();

        if (pageNum === 0) {
          setMessages(newMessages);
          // 首次加载的消息都是已发送
          const sent = new Map<number, MessageStatus>();
          newMessages.forEach(m => sent.set(m.id, 'sent'));
          setStatusMap(sent);

          if (newMessages.length > 0) {
            const latestMsg = newMessages[newMessages.length - 1];
            if (latestMsg.senderId !== friendUserId) {
              chatService.markAsRead(conversationId, latestMsg.id).catch(() => {});
            }
          }
        } else {
          setMessages(prev => [...newMessages, ...prev]);
          setStatusMap(prev => {
            const next = new Map(prev);
            newMessages.forEach(m => next.set(m.id, 'sent'));
            return next;
          });
        }

        setHasMore(!res.last);
      } catch {
        Toast.show('加载消息失败');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [conversationId, friendUserId],
  );

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      loadMessages(0);
    });
    return () => handle.cancel();
  }, [loadMessages]);

  // ---- WebSocket 实时消息 ----
  useEffect(() => {
    const topic = `/topic/conversation/${conversationId}`;
    const handler = (msg: ChatMessage) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setStatusMap(prev => new Map(prev).set(msg.id, 'sent'));

      if (msg.senderId === friendUserId) {
        chatService.markAsRead(conversationId, msg.id).catch(() => {});
        // 显示对方输入中
        setShowTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setShowTyping(false), 2000);
      }
    };

    websocketService.subscribe(topic, handler);
    websocketService.subscribe('/user/queue/messages', handler);

    return () => {
      websocketService.unsubscribe(topic);
      websocketService.unsubscribe('/user/queue/messages');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, friendUserId]);

  // ---- 滚动到底部 ----
  useEffect(() => {
    if (listData.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [listData.length]);

  // ---- 发送消息 ----
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    setInputText('');

    // 乐观更新：先插入本地消息（sending 状态）
    const tempId = -Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId,
      senderId: -1, // 自己（负数避免与真实 userId 冲突）
      content: text,
      type: 'TEXT',
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setStatusMap(prev => new Map(prev).set(tempId, 'sending'));

    try {
      const msg = await chatService.sendMessage(conversationId, text);
      // 替换临时消息为真实消息
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? msg : m)),
      );
      setStatusMap(prev => {
        const next = new Map(prev);
        next.delete(tempId);
        next.set(msg.id, 'sent');
        return next;
      });
    } catch {
      // 标记为失败
      setStatusMap(prev => new Map(prev).set(tempId, 'failed'));
      Toast.show('发送失败');
    }
  }, [inputText, conversationId]);

  // ---- 重试发送 ----
  const handleRetry = useCallback(
    async (msgId: number) => {
      const msg = messages.find(m => m.id === msgId);
      if (!msg) return;

      setStatusMap(prev => new Map(prev).set(msgId, 'sending'));

      try {
        const result = await chatService.sendMessage(conversationId, msg.content);
        setMessages(prev =>
          prev.map(m => (m.id === msgId ? result : m)),
        );
        setStatusMap(prev => {
          const next = new Map(prev);
          next.delete(msgId);
          next.set(result.id, 'sent');
          return next;
        });
      } catch {
        setStatusMap(prev => new Map(prev).set(msgId, 'failed'));
        Toast.show('发送失败');
      }
    },
    [messages, conversationId],
  );

  // ---- 删除消息 ----
  const handleDelete = useCallback((msgId: number) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    setStatusMap(prev => {
      const next = new Map(prev);
      next.delete(msgId);
      return next;
    });
  }, []);

  // ---- 加载更多 ----
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadMessages(nextPage);
    }
  }, [hasMore, loading, loadingMore, page, loadMessages]);

  // ---- FlatList 渲染 ----
  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => {
      if (item.kind === 'time') {
        return <ChatTimeItem timestamp={item.createdAt} />;
      }
      const { message, status } = item;
      const isMine = message.senderId !== friendUserId;
      return (
        <ChatMessageItem
          content={message.content}
          isMine={isMine}
          status={isMine ? status : undefined}
          myAvatarUrl={myAvatarUrl}
          otherAvatarUrl={friendAvatarUrl}
          onRetry={() => handleRetry(message.id)}
          onDelete={() => handleDelete(message.id)}
        />
      );
    },
    [friendUserId, myAvatarUrl, friendAvatarUrl, handleRetry, handleDelete],
  );

  const keyExtractor = useCallback((item: ChatListItem) => item.id, []);

  // ---- 加载中 ----
  if (loading) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.loadingContainer]}>
        <ActivityIndicator color={colors.PRIMARY} />
      </View>
    );
  }

  // ---- 页面内容 ----
  const content = (
    <>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.backBtn, dynamicStyles.backBtn]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <IconAltArrowLeft size={20} color={colors.TEXT.PRIMARY} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]} numberOfLines={1}>
          {friendNickname || '用户'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* 消息列表 */}
      <FlatList
        ref={flatListRef}
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.messageList}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMoreWrap}>
              <ActivityIndicator size="small" color={colors.TEXT.TERTIARY} />
              <Text style={[styles.loadingMoreText, { color: colors.TEXT.QUATERNARY }]}>
                加载更多...
              </Text>
            </View>
          ) : null
        }
      />

      {/* 对方正在输入提示 */}
      {showTyping && (
        <ChatTypingItem avatarUrl={friendAvatarUrl} />
      )}

      {/* 输入栏 - 胶囊式设计 */}
      <View
        style={[
          styles.inputBar,
          dynamicStyles.inputBar,
          { paddingBottom: insets.bottom + SPACING.SM },
        ]}
      >
        <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
          <TextInput
            style={[styles.textInput, dynamicStyles.textInput]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="输入消息..."
            placeholderTextColor={colors.TEXT.PLACEHOLDER}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              inputText.trim() ? dynamicStyles.sendBtn : dynamicStyles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            activeOpacity={0.7}
          >
            <Text style={[styles.sendBtnText, dynamicStyles.sendBtnText]}>发送</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView
        style={[styles.container, dynamicStyles.container]}
        behavior="padding"
        keyboardVerticalOffset={insets.top}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return <View style={[styles.container, dynamicStyles.container]}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 36,
  },
  messageList: {
    paddingVertical: SPACING.SM,
    flexGrow: 1,
  },
  loadingMoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.MD,
    gap: SPACING.SM,
  },
  loadingMoreText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
  },
  // 输入栏 - 胶囊式布局
  inputBar: {
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.FULL,
    paddingLeft: SPACING.LG,
    paddingRight: 4,
    gap: SPACING.SM,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    paddingVertical: SPACING.SM,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    maxHeight: 100,
  },
  sendBtn: {
    borderRadius: BORDER_RADIUS.FULL,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
  },
  sendBtnText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '600',
  },
});
