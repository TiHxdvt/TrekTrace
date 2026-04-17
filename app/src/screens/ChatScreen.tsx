/**
 * 聊天页面
 * 一对一文字聊天，支持实时消息接收
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
import { Avatar } from '../components/Avatar';
import { Toast } from '../components/Toast';
import { chatService } from '../services/chatService';
import { storageService } from '../services/storageService';
import { websocketService } from '../services/websocketService';
import { ChatMessage, User } from '../types';
import { IconAltArrowLeft } from '../components/SolarIcons';

type NavProp = { goBack: () => void };

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
  const { colors } = useTheme();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | undefined>();
  const flatListRef = useRef<FlatList>(null);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.BACKGROUND,
    },
    loadingContainer: {
      backgroundColor: colors.BACKGROUND,
    },
    header: {
      backgroundColor: colors.OVERLAY.NAV,
      borderBottomColor: colors.BORDER.LIGHT,
    },
    backBtn: {
      backgroundColor: colors.OVERLAY.LIGHT,
      borderColor: colors.BORDER.LIGHT,
    },
    headerTitle: {
      color: colors.TEXT.PRIMARY,
    },
    messageTextMine: {
      color: '#ffffff',
    },
    messageTextOther: {
      color: colors.TEXT.SECONDARY,
    },
    messageTimeMine: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    messageTimeOther: {
      color: colors.TEXT.QUATERNARY,
    },
    bubbleMine: {
      backgroundColor: colors.PRIMARY,
    },
    bubbleOther: {
      backgroundColor: colors.OVERLAY.MEDIUM,
      borderColor: colors.BORDER.MEDIUM,
    },
    inputBar: {
      backgroundColor: colors.OVERLAY.NAV,
      borderTopColor: colors.BORDER.LIGHT,
    },
    textInput: {
      backgroundColor: colors.OVERLAY.MEDIUM,
      borderColor: colors.BORDER.MEDIUM,
      color: colors.TEXT.PRIMARY,
    },
    sendBtn: {
      backgroundColor: colors.PRIMARY,
    },
    sendBtnText: {
      color: '#ffffff',
    },
  }), [colors]);

  // Load current user's avatar
  useEffect(() => {
    storageService.getUser().then((user: User | null) => {
      if (user?.avatarUrl) setMyAvatarUrl(user.avatarUrl);
    });
  }, []);

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
    const handle = InteractionManager.runAfterInteractions(() => {
      loadMessages(0);
    });
    return () => handle.cancel();
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
        <View style={[styles.messageBubble, isMine ? dynamicStyles.bubbleMine : dynamicStyles.bubbleOther, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.messageText, isMine ? dynamicStyles.messageTextMine : dynamicStyles.messageTextOther]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isMine ? dynamicStyles.messageTimeMine : dynamicStyles.messageTimeOther]}>
            {formatMessageTime(item.createdAt)}
          </Text>
        </View>
        {isMine && (
          <Avatar uri={myAvatarUrl} size={32} />
        )}
      </View>
    );
  }, [friendUserId, friendAvatarUrl, myAvatarUrl, dynamicStyles]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.loadingContainer]}>
        <ActivityIndicator color={colors.PRIMARY} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, dynamicStyles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      {/* Header - centered title */}
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
      <View style={[styles.inputBar, dynamicStyles.inputBar, { paddingBottom: insets.bottom + SPACING.SM }]}>
        <View style={styles.inputWrap}>
          <TextInput
            style={[styles.textInput, dynamicStyles.textInput]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="输入消息..."
            placeholderTextColor={colors.TEXT.PLACEHOLDER}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, dynamicStyles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.7}
          >
            <Text style={[styles.sendBtnText, dynamicStyles.sendBtnText]}>发送</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
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
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    lineHeight: TYPOGRAPHY.FONT_SIZE.BASE * TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  messageTextMine: {
  },
  messageTextOther: {
  },
  messageTime: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    marginTop: 2,
  },
  messageTimeMine: {
    textAlign: 'right',
  },
  messageTimeOther: {
  },
  inputBar: {
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.SM,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.XL,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    maxHeight: 100,
  },
  sendBtn: {
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
  },
});
