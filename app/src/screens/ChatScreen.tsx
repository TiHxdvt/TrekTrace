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
  PermissionsAndroid,
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
import { IconAltArrowLeft, IconSmileCircle, IconAddCircle, IconMagnifer } from '../components/SolarIcons';
import { ChatTimeItem } from '../components/chat/ChatTimeItem';
import { ChatMessageItem } from '../components/chat/ChatMessageItem';
import { ChatImageViewer } from '../components/chat/ChatImageViewer';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { ChatTypingItem } from '../components/chat/ChatTypingItem';
import { ChatAttachmentPanel } from '../components/chat/ChatAttachmentPanel';
import {
  transformMessagesToList,
  ChatListItem,
  MessageStatus,
} from '../components/chat/chatDataTransform';
import { resolveMediaUrl } from '../components/chat/ChatImageMessage';

type NavProp = { goBack: () => void };

interface ChatScreenParams {
  conversationId: number;
  friendNickname?: string;
  friendAvatarUrl?: string;
  friendUserId: number;
  conversationType?: string;
  conversationName?: string;
}

export const ChatScreen: React.FC<{ navigation: NavProp; route: { params: ChatScreenParams } }> = ({
  navigation,
  route,
}) => {
  const { conversationId, friendNickname, friendAvatarUrl, friendUserId, conversationType, conversationName } = route.params;
  const isGroupChat = conversationType === 'GROUP';
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
  const [showSearch, setShowSearch] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUris, setViewerUris] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [searching, setSearching] = useState(false);

  // 消息发送状态 Map: localId → 'sending' | 'sent' | 'failed' | 'read'
  const [statusMap, setStatusMap] = useState<Map<number, MessageStatus>>(new Map());

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 已通过 API 发送成功的消息 serverId 集合，用于 WebSocket 去重（避免重复插入） */
  const sentServerIds = useRef<Set<number>>(new Set());
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
          // 确保会话存在于本地 conversations 表（从好友页直接打开时可能缺失）
          chatDB.ensureConversation({
            conversationId,
            friendUserId,
            friendNickname,
            friendAvatarUrl,
            conversationType,
            conversationName,
          });

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
      // 后台同步该会话消息，仅在有新消息时才重新加载
      syncConversationMessages(conversationId).then(hasNew => {
        if (hasNew) loadMessages(0);
      });
    });
    return () => handle.cancel();
  }, [loadMessages, conversationId]);

  // ---- WebSocket 实时消息 → 写入本地 DB ----
  useEffect(() => {
    const topic = `/topic/conversation/${conversationId}`;
    const handler = (msgRaw: Record<string, unknown>) => {
      const msg = msgRaw as unknown as ChatMessage;
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
        // 自己刚通过 API 发送的消息：乐观消息已在列表中，跳过
        // 注意：不能 delete，因为 WebSocket 有两个订阅会触发两次，第二次也需要跳过
        if (sentServerIds.current.has(msg.id)) {
          return prev;
        }
        // 如果已存在同 id 的消息，检查是否为更新（如撤回）
        const existingIdx = prev.findIndex(m => m.id === msg.id);
        if (existingIdx !== -1) {
          // 撤回等更新：替换已有消息
          if (msg.type === 'RECALLED' || prev[existingIdx].type !== msg.type) {
            return prev.map(m => m.id === msg.id ? msg : m);
          }
          return prev;
        }
        // 如果是自己的消息，移除对应的乐观临时消息（通过 conversationId + type + 匹配 + 时间窗口）
        const MSG_WINDOW_MS = 5000; // 5 秒窗口内视为同一条消息
        const filtered = prev.filter(m => {
          if (m.id < 0 && m.conversationId === msg.conversationId && m.type === msg.type && m.senderId === msg.senderId) {
            const age = Date.now() - (m as any)._createdAt;
            if (age > MSG_WINDOW_MS) return true; // 超出时间窗口，保留
            // 乐观消息：检查是否匹配
            if (msg.type === 'LOCATION' && m.latitude === msg.latitude && m.longitude === msg.longitude) return false;
            if (msg.mediaUrl && m.mediaUrl === msg.mediaUrl) return false;
            if (msg.content && m.content === msg.content) return false;
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
      websocketService.unsubscribe('/user/queue/typing');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, friendUserId]);

  // ---- 订阅 typing 事件 ----
  useEffect(() => {
    const handler = (dataRaw: Record<string, unknown>) => {
      const data = dataRaw as { typing: boolean; userId: number };
      if (data.typing) {
        setShowTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setShowTyping(false), 3000);
      } else {
        setShowTyping(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    };

    websocketService.subscribe('/user/queue/typing', handler);

    return () => {
      websocketService.unsubscribe('/user/queue/typing');
    };
  }, []);

  // ---- 发送 typing 事件 ----
  const sendTypingEvent = useCallback((typing: boolean) => {
    try {
      websocketService.send('/app/chat.typing', {
        conversationId,
        typing,
      });
    } catch {
      // 发送失败不影响体验
    }
  }, [conversationId]);

  // ---- 输入变化时发送 typing ----
  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
    if (text.trim()) {
      sendTypingEvent(true);
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = setTimeout(() => {
        sendTypingEvent(false);
      }, 3000);
    } else {
      sendTypingEvent(false);
    }
  }, [sendTypingEvent]);

  // ---- listData 计算（倒序，最新消息在 index 0，配合 inverted FlatList） ----
  const listData = useMemo(
    () => transformMessagesToList(messages, statusMap).reverse(),
    [messages, statusMap],
  );

  // ---- 所有图片数据（按消息时间排序，msgId 消歧重复 URL） ----
  const { imageUris, imageMsgIds } = useMemo(() => {
    const items = messages
      .filter(m => m.type === 'IMAGE' && m.mediaUrl)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return {
      imageUris: items.map(m => resolveMediaUrl(m.mediaUrl!)),
      imageMsgIds: items.map(m => m.id),
    };
  }, [messages]);

  // ---- 点击图片打开画廊（用 msgId 定位，不受重复 URL 影响） ----
  const handleImagePress = useCallback((msgId: number, imageUri: string) => {
    const idx = imageMsgIds.indexOf(msgId);
    setViewerUris(imageUris);
    setViewerIndex(idx >= 0 ? idx : 0);
    setViewerVisible(true);
  }, [imageUris, imageMsgIds]);

  // ---- 乐观更新辅助函数 ----
  const replaceOptimistic = useCallback(
    (optimisticId: number, serverMsg: ChatMessage) => {
      setMessages(prev => {
        const hasServerMsg = prev.some(m => m.id === serverMsg.id);
        if (hasServerMsg) {
          return prev.filter(m => m.id !== optimisticId);
        }
        return prev.map(m => {
          if (m.id !== optimisticId) return m;
          // 保留 localKey 和图片本地 URI + 尺寸，避免 FlatList 重建组件
          if (m.mediaUrl) {
            return { ...serverMsg, localKey: m.localKey, mediaUrl: m.mediaUrl, mediaWidth: m.mediaWidth, mediaHeight: m.mediaHeight };
          }
          return { ...serverMsg, localKey: m.localKey };
        });
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
      localKey: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
  // 乐观渲染：用本地 file:// URI 立即展示（本地文件秒渲染），不做 replaceOptimistic
  const handleSendImage = useCallback(async (imageUri: string, fileSize?: number, imgWidth?: number, imgHeight?: number) => {
    setShowAttachment(false);
    const myUserId = await getCurrentUserId();
    const now = new Date().toISOString();

    // 压缩图片：限制最大 1920px，JPEG 质量 0.7，确保不超过服务端 5MB 限制
    let uploadUri = imageUri;
    try {
      const resized = await ImageResizer.createResizedImage(
        imageUri, 1920, 1920, 'JPEG', 70, 0, undefined,
      );
      if (resized.uri) uploadUri = resized.uri;
    } catch {}

    const optimisticId = -Date.now();
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      localKey: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      conversationId,
      senderId: myUserId,
      content: '[图片]',
      type: 'IMAGE',
      mediaType: 'IMAGE',
      mediaUrl: imageUri,
      mediaSize: fileSize,
      mediaWidth: imgWidth,
      mediaHeight: imgHeight,
      createdAt: now,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setStatusMap(prev => new Map(prev).set(optimisticId, 'sending'));

    try {
      const uploadResult = await chatService.uploadMedia(uploadUri, undefined);
      const serverMsg = await chatService.sendMessage(conversationId, '[图片]', {
        mediaType: 'IMAGE',
        mediaUrl: uploadResult.url,
        mediaSize: fileSize,
      });

      // 写入 DB（下次打开聊天时从 DB 加载服务器 URL）
      try {
        if (!chatDB.messageExists(serverMsg.id)) {
          chatDB.insertMessage(serverMsg);
        }
        chatDB.updateConversationLastMessage(conversationId, '[图片]', serverMsg.createdAt);
      } catch {}

      // 标记已发送 + 记录 serverId，防止 WebSocket 重复插入
      sentServerIds.current.add(serverMsg.id);
      setStatusMap(prev => {
        const next = new Map(prev);
        next.delete(optimisticId);
        next.set(optimisticId, 'sent');
        return next;
      });
    } catch {
      setStatusMap(prev => new Map(prev).set(optimisticId, 'failed'));
      Toast.show('图片发送失败');
    }
  }, [conversationId]);

  // ---- 发送语音消息 ----
  const handleSendAudio = useCallback(async (audioUri: string, duration: number) => {
    const myUserId = await getCurrentUserId();
    const now = new Date().toISOString();

    const optimisticMsg: ChatMessage = {
      id: -Date.now(),
      localKey: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
        duration,
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
            localKey: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    // Android 需要手动请求相机权限
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: '相机权限',
          message: '需要相机权限来拍摄照片',
          buttonNeutral: '稍后再问',
          buttonNegative: '拒绝',
          buttonPositive: '允许',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Toast.show('需要相机权限才能拍照');
        return;
      }
    }

    try {
      const { launchCamera } = await import('react-native-image-picker');
      launchCamera({ mediaType: 'photo', quality: 0.8 }, (response) => {
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (asset.uri) {
            handleSendImage(asset.uri, asset.fileSize, asset.width, asset.height);
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
            handleSendImage(asset.uri, asset.fileSize, asset.width, asset.height);
          }
        }
      });
    } catch {
      Toast.show('相册不可用');
    }
  }, [handleSendImage]);

  // ---- 消息搜索 ----
  const handleSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await chatService.searchMessages(conversationId, keyword);
      setSearchResults(results);
    } catch {
      Toast.show('搜索失败');
    } finally {
      setSearching(false);
    }
  }, [conversationId]);

  const handleSearchResultPress = useCallback((msg: ChatMessage) => {
    setShowSearch(false);
    setSearchKeyword('');
    setSearchResults([]);
    // Scroll to the message by finding its index in listData
    const index = listData.findIndex(item => item.kind === 'message' && item.message.id === msg.id);
    if (index !== -1) {
      flatListRef.current?.scrollToIndex({ index, animated: true });
    }
  }, [listData]);

  // ---- 语音录制 ----
  const handleStartRecording = useCallback(async () => {
    try {
      const audioService = await import('../services/audioService');
      await audioService.startRecording();
      setIsRecording(true);
    } catch {
      Toast.show('录音启动失败');
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    setIsRecording(false);
    try {
      const audioService = await import('../services/audioService');
      const { uri, duration: audioDuration } = await audioService.stopRecording();
      if (uri && audioDuration > 0) {
        handleSendAudio(uri, audioDuration);
      }
    } catch {
      Toast.show('录音失败');
    }
  }, [handleSendAudio]);

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
          mediaWidth={message.mediaWidth}
          mediaHeight={message.mediaHeight}
          latitude={message.latitude}
          longitude={message.longitude}
          duration={message.duration}
          createdAt={message.createdAt}
          senderNickname={message.senderNickname}
          isGroupChat={isGroupChat}
          onImagePress={(uri: string) => handleImagePress(message.id, uri)}
        />
      );
    },
    [friendUserId, myAvatarUrl, friendAvatarUrl, handleRetry, handleDelete, handleRecall, handleImagePress],
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
          onPress={() => {
            if (showSearch) {
              setShowSearch(false);
              setSearchKeyword('');
              setSearchResults([]);
            } else {
              navigation.goBack();
            }
          }}
          activeOpacity={0.7}
        >
          <IconAltArrowLeft size={20} color={colors.TEXT.PRIMARY} />
        </TouchableOpacity>
        {showSearch ? (
          <TextInput
            style={[styles.searchInput, { color: colors.TEXT.PRIMARY, backgroundColor: colors.OVERLAY.MEDIUM, borderColor: colors.BORDER.MEDIUM }]}
            value={searchKeyword}
            onChangeText={(text) => {
              setSearchKeyword(text);
              if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
              searchTimerRef.current = setTimeout(() => handleSearch(text), 300);
            }}
            placeholder="搜索消息..."
            placeholderTextColor={colors.TEXT.PLACEHOLDER}
            autoFocus
          />
        ) : (
          <Text style={[styles.headerTitle, dynamicStyles.headerTitle]} numberOfLines={1}>
            {isGroupChat ? (conversationName || '群聊') : (friendNickname || '用户')}
          </Text>
        )}
        {!showSearch && (
          <TouchableOpacity
            style={[styles.backBtn, dynamicStyles.backBtn]}
            onPress={() => setShowSearch(true)}
            activeOpacity={0.7}
          >
            <IconMagnifer size={20} color={colors.TEXT.PRIMARY} />
          </TouchableOpacity>
        )}
        {!showSearch && <View style={styles.headerRight} />}
      </View>

      {/* 消息列表 */}
      <FlatList
        ref={flatListRef}
        data={listData}
        inverted={true}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.messageList}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
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
      {showTyping && !showSearch && (
        <ChatTypingItem avatarUrl={friendAvatarUrl} />
      )}

      {/* 搜索结果 */}
      {showSearch && searchResults.length > 0 && (
        <View style={[styles.searchResultsOverlay, { backgroundColor: colors.BACKGROUND }]}>
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
            style={styles.searchResultsList}
          />
        </View>
      )}
      {showSearch && searching && (
        <View style={[styles.searchResultsOverlay, { backgroundColor: colors.BACKGROUND, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator color={colors.PRIMARY} />
        </View>
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
              onChangeText={handleInputChange}
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

      {/* 全屏图片画廊 */}
      <ChatImageViewer
        visible={viewerVisible}
        imageUris={viewerUris}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
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
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    borderRadius: BORDER_RADIUS.FULL,
    borderWidth: 1,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    marginHorizontal: SPACING.SM,
  },
  searchResultsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  searchResultsList: {
    flex: 1,
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
