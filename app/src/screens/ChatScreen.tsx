/**
 * 聊天页面
 * 一对一文字聊天，支持实时消息接收
 * 延续 glassmorphism 设计风格
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { DrawerStackParamList } from '../navigation/DrawerStack';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { Avatar } from '../components/Avatar';
import { Toast } from '../components/Toast';
import { chatService } from '../services/chatService';
import { storageService } from '../services/storageService';
import { websocketService } from '../services/websocketService';
import { ChatMessage, User } from '../types';
import { IconAltArrowRight } from '../components/SolarIcons';

type NavProp = StackNavigationProp<DrawerStackParamList, 'Chat'>;

interface ChatScreenParams {
  conversationId: number;
  friendNickname?: string;
  friendAvatarUrl?: string;
  friendUserId: number;
}

function formatMessageTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export const ChatScreen: React.FC<{ navigation: NavProp; route: { params: ChatScreenParams } }> = ({
  navigation,
  route,
}) => {
  const { conversationId, friendNickname, friendAvatarUrl, friendUserId } = route.params;
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | undefined>();
  const flatListRef = useRef<FlatList>(null);

  // Load current user's avatar
  useEffect(() => {
    storageService.getUser().then((user: User | null) => {
      if (user?.avatarUrl) setMyAvatarUrl(user.avatarUrl);
    });
  }, []);

  // Hide the floating tab bar when Chat screen is active
  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({ tabBarVisible: false });
    }
    return () => {
      if (parent) {
        parent.setOptions({ tabBarVisible: true });
      }
    };
  }, [navigation]);

  const loadMessages = useCallback(async (pageNum: number = 0) => {
    try {
      const res = await chatService.getMessages(conversationId, pageNum, 20);
      const newMessages = res.content.reverse();
      if (pageNum === 0) {
        setMessages(newMessages);
        if (newMessages.length > 0) {
          const latestMsg = newMessages[newMessages.length - 1];
          if (latestMsg.senderId !== friendUserId) {
            chatService.markAsRead(conversationId, latestMsg.id).catch(() => {});
          }
        }
      } else {
        setMessages(prev => [...newMessages, ...prev]);
      }
      setHasMore(!res.last);
    } catch {
      Toast.show('加载消息失败');
    } finally {
      setLoading(false);
    }
  }, [conversationId, friendUserId]);

  useEffect(() => {
    loadMessages(0);
  }, [loadMessages]);

  useEffect(() => {
    const topic = `/topic/conversation/${conversationId}`;
    const handler = (msg: ChatMessage) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.senderId === friendUserId) {
        chatService.markAsRead(conversationId, msg.id).catch(() => {});
      }
    };

    websocketService.subscribe(topic, handler);
    websocketService.subscribe('/user/queue/messages', handler);

    return () => {
      websocketService.unsubscribe(topic);
      websocketService.unsubscribe('/user/queue/messages');
    };
  }, [conversationId, friendUserId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText('');
    try {
      const msg = await chatService.sendMessage(conversationId, text);
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch {
      Toast.show('发送失败');
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadMessages(nextPage);
    }
  };

  const renderItem = useCallback(({ item }: { item: ChatMessage }) => {
    const isMine = item.senderId !== friendUserId;
    return (
      <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowOther]}>
        {!isMine && (
          <Avatar uri={friendAvatarUrl} size={32} />
        )}
        <View style={[styles.messageBubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextOther]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isMine ? styles.messageTimeMine : styles.messageTimeOther]}>
            {formatMessageTime(item.createdAt)}
          </Text>
        </View>
        {isMine && (
          <Avatar uri={myAvatarUrl} size={32} />
        )}
      </View>
    );
  }, [friendUserId, friendAvatarUrl, myAvatarUrl]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      {/* Header - centered title */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <IconAltArrowRight size={20} color={COLORS.TEXT.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {friendNickname || '用户'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.messageList}
        inverted={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      {/* Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + SPACING.SM }]}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="输入消息..."
            placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.7}
          >
            <Text style={styles.sendBtnText}>发送</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingBottom: SPACING.MD,
    backgroundColor: COLORS.OVERLAY.NAV,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.LIGHT,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
  },
  headerRight: {
    width: 36,
  },
  messageList: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    paddingBottom: SPACING.XL,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.MD,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
    gap: SPACING.SM,
  },
  messageRowOther: {
    justifyContent: 'flex-start',
    gap: SPACING.SM,
  },
  messageBubble: {
    maxWidth: '65%',
    borderRadius: BORDER_RADIUS.LG,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  bubbleMine: {
    backgroundColor: COLORS.PRIMARY,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    lineHeight: TYPOGRAPHY.FONT_SIZE.BASE * TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  messageTextMine: {
    color: COLORS.TEXT.PRIMARY,
  },
  messageTextOther: {
    color: COLORS.TEXT.SECONDARY,
  },
  messageTime: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    marginTop: 2,
  },
  messageTimeMine: {
    color: COLORS.TEXT.TERTIARY,
    textAlign: 'right',
  },
  messageTimeOther: {
    color: COLORS.TEXT.QUATERNARY,
  },
  inputBar: {
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.SM,
    backgroundColor: COLORS.OVERLAY.NAV,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.LIGHT,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.SM,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    borderRadius: BORDER_RADIUS.XL,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.TEXT.PRIMARY,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: BORDER_RADIUS.XL,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
});
