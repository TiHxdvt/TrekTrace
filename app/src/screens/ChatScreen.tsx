/**
 * 聊天页面
 * 一对一聊天，支持：文本、图片、语音、位置、已读回执、撤回
 * 延续 glassmorphism 设计风格
 *
 * 本地优先架构：消息读写优先走本地 SQLite，同步在后台进行
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Keyboard,
  Platform,
  ActivityIndicator,
  InteractionManager,
  type KeyboardEvent,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { Toast } from '../components/Toast';
import { chatService } from '../services/chatService';
import { storageService } from '../services/storageService';
import { websocketService } from '../services/websocketService';
import * as chatDB from '../services/chatDatabaseService';
import { syncConversationMessages, sendLocalMessage, getCurrentUserId } from '../services/chatSyncService';
import { ChatMessage, User } from '../types';
import { IconAltArrowLeft, IconSmileCircle, IconAddCircle } from '../components/SolarIcons';
import { ChatTimeItem } from '../components/chat/ChatTimeItem';
import { ChatMessageItem } from '../components/chat/ChatMessageItem';
import { ChatTypingItem } from '../components/chat/ChatTypingItem';
import { ChatAttachmentPanel } from '../components/chat/ChatAttachmentPanel';
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
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | undefined>();
  const [showTyping, setShowTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showAttachment, setShowAttachment] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // 消息发送状态 Map: localId → 'sending' | 'sent' | 'failed' | 'read'
  const [statusMap, setStatusMap] = useState<Map<number, MessageStatus>>(new Map());

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pageSize = 50;

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
        attachBtn: {
          backgroundColor: colors.OVERLAY.LIGHT,
        },
        emojiBtn: {
          backgroundColor: colors.OVERLAY.LIGHT,
        },
        recordBtn: {
          backgroundColor: colors.ERROR,
        },
        recordBtnActive: {
          backgroundColor: colors.WARNING,
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

  // ---- 键盘高度监听 ----
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      setShowEmoji(false);
      setShowAttachment(false);
    };
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ---- 从本地 DB 加载消息 ----
  const loadMessages = useCallback(
    async (currentOffset: number = 0) => {
      try {
        if (currentOffset > 0) setLoadingMore(true);

        const dbMessages = chatDB.getMessages(conversationId, pageSize, currentOffset);

        if (currentOffset === 0) {
          setMessages(dbMessages);
          // 构建 statusMap：从 DB 中读取的消息默认 sent
          const sent = new Map<number, MessageStatus>();
          dbMessages.forEach(m => {
            if (m.id) sent.set(m.id, 'sent');
          });
          setStatusMap(sent);

          if (dbMessages.length > 0) {
            const latestMsg = dbMessages[dbMessages.length - 1];
            if (latestMsg.senderId !== friendUserId) {
              chatService.markAsRead(conversationId, latestMsg.id).catch(() => {});
            }
          }

          setHasMore(dbMessages.length >= pageSize);
        } else {
          setMessages(prev => [...dbMessages, ...prev]);
          setStatusMap(prev => {
            const next = new Map(prev);
            dbMessages.forEach(m => {
              if (m.id) next.set(m.id, 'sent');
            });
            return next;
          });
        }
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
      // 后台同步该会话消息
      syncConversationMessages(conversationId).then(() => {
        // 同步完成后重新加载以合并新消息
        loadMessages(0);
      });
    });
    return () => handle.cancel();
  }, [loadMessages, conversationId]);

  // ---- WebSocket 实时消息 → 写入本地 DB ----
  useEffect(() => {
    const topic = `/topic/conversation/${conversationId}`;
    const handler = (msg: ChatMessage) => {
      // 写入本地 DB
      try {
        if (!chatDB.messageExists(msg.id)) {
          chatDB.insertMessage(msg);
        } else if (msg.type === 'RECALLED') {
          chatDB.updateMessageRecalled(msg.id);
        }
        // 更新会话最后消息
        const lastContent = msg.type === 'IMAGE' ? '[图片]'
          : msg.type === 'AUDIO' ? '[语音]'
          : msg.type === 'LOCATION' ? '[位置]'
          : msg.type === 'RECALLED' ? '[已撤回]'
          : msg.content;
        chatDB.updateConversationLastMessage(conversationId, lastContent, msg.createdAt);
      } catch {
        // DB 操作失败不影响 UI
      }

      setMessages(prev => {
        // 如果已存在同 id 的消息，检查是否为更新（如撤回）
        const existingIdx = prev.findIndex(m => m.id === msg.id);
        if (existingIdx !== -1) {
          // 撤回等更新：替换已有消息
          if (msg.type === 'RECALLED' || prev[existingIdx].type !== msg.type) {
            return prev.map(m => m.id === msg.id ? msg : m);
          }
          return prev;
        }
        // 如果是自己的消息，移除对应的乐观临时消息（通过 conversationId + type + mediaUrl 匹配）
        const filtered = prev.filter(m => {
          if (m.id < 0 && m.conversationId === msg.conversationId && m.type === msg.type) {
            // 乐观消息：检查是否匹配
            if (msg.type === 'LOCATION' && m.latitude === msg.latitude && m.longitude === msg.longitude) return false;
            if (msg.mediaUrl && m.mediaUrl === msg.mediaUrl) return false;
            if (msg.content && m.content === msg.content && m.senderId === msg.senderId) return false;
          }
          return true;
        });
        return [...filtered, msg];
      });
      setStatusMap(prev => new Map(prev).set(msg.id, 'sent'));

      if (msg.senderId === friendUserId) {
        chatService.markAsRead(conversationId, msg.id).catch(() => {});
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

  // ---- listData 计算 ----
  const listData = useMemo(
    () => transformMessagesToList(messages, statusMap),
    [messages, statusMap],
  );

  // ---- 滚动到底部 ----
  useEffect(() => {
    if (listData.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [listData.length]);

  // ---- 乐观更新辅助函数 ----
  const replaceOptimistic = useCallback(
    (optimisticId: number, serverMsg: ChatMessage) => {
      setMessages(prev => {
        const hasServerMsg = prev.some(m => m.id === serverMsg.id);
        if (hasServerMsg) {
          return prev.filter(m => m.id !== optimisticId);
        }
        return prev.map(m => (m.id === optimisticId ? serverMsg : m));
      });
      setStatusMap(prev => {
        const next = new Map(prev);
        next.delete(optimisticId);
        next.set(serverMsg.id, 'sent');
        return next;
      });
    },
    [],
  );

  const markOptimisticFailed = useCallback(
    (optimisticId: number) => {
      setStatusMap(prev => new Map(prev).set(optimisticId, 'failed'));
    },
    [],
  );

  // ---- 发送消息（本地优先） ----
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    setInputText('');
    setShowEmoji(false);

    const localId = `local-${Date.now()}`;
    const myUserId = await getCurrentUserId();

    // 乐观更新：立即插入本地消息到 UI
    const optimisticMsg: ChatMessage = {
      id: -Date.now(),
      conversationId,
      senderId: myUserId,
      content: text,
      type: 'TEXT',
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setStatusMap(prev => new Map(prev).set(optimisticMsg.id, 'sending'));

    // 本地优先发送：写入 DB + 调 API
    const result = await sendLocalMessage(localId, conversationId, myUserId, text);

    if (result.success && result.serverMessage) {
      replaceOptimistic(optimisticMsg.id, result.serverMessage);
    } else {
      markOptimisticFailed(optimisticMsg.id);
      Toast.show('发送失败');
    }
  }, [inputText, conversationId, replaceOptimistic, markOptimisticFailed]);

  // ---- 发送图片消息 ----
  const handleSendImage = useCallback(async (imageUri: string, fileSize?: number) => {
    setShowAttachment(false);
    const myUserId = await getCurrentUserId();
    const now = new Date().toISOString();

    // 乐观更新
    const optimisticMsg: ChatMessage = {
      id: -Date.now(),
      conversationId,
      senderId: myUserId,
      content: '[图片]',
      type: 'IMAGE',
      mediaType: 'IMAGE',
      mediaUrl: imageUri, // 本地 URI 先展示
      mediaSize: fileSize,
      createdAt: now,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setStatusMap(prev => new Map(prev).set(optimisticMsg.id, 'sending'));

    try {
      // 上传文件
      const uploadResult = await chatService.uploadMedia(imageUri, 'image/jpeg');
      // 发送消息
      const serverMsg = await chatService.sendMessage(conversationId, '[图片]', {
        mediaType: 'IMAGE',
        mediaUrl: uploadResult.url,
        mediaSize: fileSize,
      });

      replaceOptimistic(optimisticMsg.id, serverMsg);
    } catch {
      markOptimisticFailed(optimisticMsg.id);
      Toast.show('图片发送失败');
    }
  }, [conversationId, replaceOptimistic, markOptimisticFailed]);

  // ---- 发送语音消息 ----
  const handleSendAudio = useCallback(async (audioUri: string, duration: number) => {
    const myUserId = await getCurrentUserId();
    const now = new Date().toISOString();

    const optimisticMsg: ChatMessage = {
      id: -Date.now(),
      conversationId,
      senderId: myUserId,
      content: '[语音]',
      type: 'AUDIO',
      mediaType: 'AUDIO',
      mediaUrl: audioUri,
      createdAt: now,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setStatusMap(prev => new Map(prev).set(optimisticMsg.id, 'sending'));

    try {
      const uploadResult = await chatService.uploadMedia(audioUri, 'audio/aac');
      const serverMsg = await chatService.sendMessage(conversationId, '[语音]', {
        mediaType: 'AUDIO',
        mediaUrl: uploadResult.url,
      });

      replaceOptimistic(optimisticMsg.id, serverMsg);
    } catch {
      markOptimisticFailed(optimisticMsg.id);
      Toast.show('语音发送失败');
    }
  }, [conversationId, replaceOptimistic, markOptimisticFailed]);

  // ---- 发送位置消息 ----
  const handleSendLocation = useCallback(async () => {
    setShowAttachment(false);

    try {
      // Dynamic import to handle missing native module gracefully
      const Geolocation = (await import('@react-native-community/geolocation')).default;

      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const myUserId = await getCurrentUserId();
          const now = new Date().toISOString();

          const optimisticMsg: ChatMessage = {
            id: -Date.now(),
            conversationId,
            senderId: myUserId,
            content: '位置分享',
            type: 'LOCATION',
            mediaType: 'LOCATION',
            latitude,
            longitude,
            createdAt: now,
          };

          setMessages(prev => [...prev, optimisticMsg]);
          setStatusMap(prev => new Map(prev).set(optimisticMsg.id, 'sending'));

          try {
            const serverMsg = await chatService.sendMessage(conversationId, '位置分享', {
              latitude,
              longitude,
            });

            replaceOptimistic(optimisticMsg.id, serverMsg);
          } catch {
            markOptimisticFailed(optimisticMsg.id);
            Toast.show('位置发送失败');
          }
        },
        () => {
          Toast.show('无法获取位置信息');
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    } catch {
      Toast.show('定位服务不可用');
    }
  }, [conversationId, replaceOptimistic, markOptimisticFailed]);

  // ---- 撤回消息 ----
  const handleRecall = useCallback(
    async (msgId: number) => {
      try {
        const recalled = await chatService.recallMessage(msgId);
        setMessages(prev =>
          prev.map(m => (m.id === msgId ? { ...m, type: 'RECALLED', mediaType: 'RECALLED', content: '', mediaUrl: undefined } : m)),
        );
        // 同步到本地 DB
        chatDB.updateMessageRecalled(msgId);
      } catch (e: any) {
        Toast.show(e?.response?.data?.message || '撤回失败');
      }
    },
    [],
  );

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

  // ---- 删除消息（本地软删除 + API） ----
  const handleDelete = useCallback(
    (msgId: number) => {
      // 本地软删除
      chatDB.softDeleteMessage(msgId);
      // 调 API 删除
      chatService.deleteMessage(msgId).catch(() => {});

      setMessages(prev => prev.filter(m => m.id !== msgId));
      setStatusMap(prev => {
        const next = new Map(prev);
        next.delete(msgId);
        return next;
      });
    },
    [],
  );

  // ---- 附件面板操作 ----
  const handleCamera = useCallback(async () => {
    try {
      const { launchCamera } = await import('react-native-image-picker');
      launchCamera({ mediaType: 'photo', quality: 0.8 }, (response) => {
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (asset.uri) {
            handleSendImage(asset.uri, asset.fileSize);
          }
        }
      });
    } catch {
      Toast.show('相机不可用');
    }
  }, [handleSendImage]);

  const handleGallery = useCallback(async () => {
    try {
      const { launchImageLibrary } = await import('react-native-image-picker');
      launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (asset.uri) {
            handleSendImage(asset.uri, asset.fileSize);
          }
        }
      });
    } catch {
      Toast.show('相册不可用');
    }
  }, [handleSendImage]);

  // ---- 语音录制 ----
  const handleStartRecording = useCallback(async () => {
    Toast.show('录音功能暂不可用');
  }, []);

  const handleStopRecording = useCallback(async () => {
    setIsRecording(false);
  }, []);

  // ---- 加载更多 ----
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore) {
      const nextOffset = offset + pageSize;
      setOffset(nextOffset);
      loadMessages(nextOffset);
    }
  }, [hasMore, loading, loadingMore, offset, loadMessages]);

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
          onRecall={() => handleRecall(message.id)}
          mediaType={message.type === 'RECALLED' ? 'RECALLED'
            : message.type === 'IMAGE' ? 'IMAGE'
            : message.type === 'AUDIO' ? 'AUDIO'
            : message.type === 'LOCATION' ? 'LOCATION'
            : undefined}
          mediaUrl={message.mediaUrl}
          mediaSize={message.mediaSize}
          latitude={message.latitude}
          longitude={message.longitude}
          createdAt={message.createdAt}
        />
      );
    },
    [friendUserId, myAvatarUrl, friendAvatarUrl, handleRetry, handleDelete, handleRecall],
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

      {/* 输入区域 */}
      <View style={styles.inputAreaWrapper}>
        {/* 附件弹出列表 */}
        <ChatAttachmentPanel
          visible={showAttachment}
          onClose={() => setShowAttachment(false)}
          onCamera={handleCamera}
          onGallery={handleGallery}
          onLocation={handleSendLocation}
        />

        {/* 输入栏 */}
        <View
          style={[
            styles.inputBar,
            dynamicStyles.inputBar,
            { paddingBottom: (showEmoji || showAttachment ? 0 : keyboardHeight) + insets.bottom + SPACING.SM },
          ]}
        >
          <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
            {/* + 附件按钮 */}
            <TouchableOpacity
              style={[styles.iconBtn, dynamicStyles.attachBtn]}
              onPress={() => {
                setShowAttachment(prev => !prev);
                setShowEmoji(false);
                Keyboard.dismiss();
              }}
              activeOpacity={0.7}
            >
              <IconAddCircle size={28} color={colors.TEXT.SECONDARY} />
            </TouchableOpacity>

            {/* 文本输入 */}
            <TextInput
              style={[styles.textInput, dynamicStyles.textInput]}
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => {
                setShowEmoji(false);
                setShowAttachment(false);
              }}
              placeholder="输入消息..."
              placeholderTextColor={colors.TEXT.PLACEHOLDER}
              multiline
              maxLength={500}
            />

            {/* Emoji 按钮 */}
            <TouchableOpacity
              style={[styles.iconBtn, dynamicStyles.emojiBtn]}
              onPress={() => {
                setShowEmoji(prev => !prev);
                setShowAttachment(false);
                Keyboard.dismiss();
              }}
              activeOpacity={0.7}
            >
              <IconSmileCircle size={28} color={colors.TEXT.SECONDARY} />
            </TouchableOpacity>

            {/* 发送按钮 */}
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
      </View>

      {/* Emoji 面板（简化版） */}
      {showEmoji && (
        <View style={[styles.emojiPanel, { backgroundColor: colors.OVERLAY.NAV, paddingBottom: insets.bottom }]}>
          <View style={styles.emojiGrid}>
            {['😀', '😂', '🤣', '😍', '🥰', '😘', '😎', '🤔', '😅', '😢', '😭', '😡', '👍', '👎', '❤️', '🔥', '⭐', '🎉', '💯', '🙏', '👏', '💪', '🤝', '✌️', '🫶'].map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiItem}
                onPress={() => setInputText(prev => prev + emoji)}
                activeOpacity={0.6}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </>
  );

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
  // 输入区域容器（用于定位附件弹出列表）
  inputAreaWrapper: {
    position: 'relative',
  },
  // 输入栏
  inputBar: {
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.FULL,
    paddingLeft: SPACING.XS,
    paddingRight: SPACING.XS,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    maxHeight: 100,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  sendBtn: {
    borderRadius: BORDER_RADIUS.FULL,
    paddingHorizontal: SPACING.MD,
    justifyContent: 'center',
    alignItems: 'center',
    height: 34,
  },
  sendBtnText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '600',
  },
  // Emoji 面板
  emojiPanel: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  emojiItem: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
});
