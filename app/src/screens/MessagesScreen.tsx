/**
 * 消息页面 - 会话列表
 * 显示所有聊天会话，支持实时新消息推送
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { IconChatRoundDots, IconCheckCircle, IconMagnifer } from '../components/SolarIcons';
import { Toast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { notificationService } from '../services/notificationService';
import { chatService } from '../services/chatService';
import { websocketService } from '../services/websocketService';
import { Conversation } from '../types';

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function truncateContent(content: string, maxLen = 30): string {
  if (content.length <= maxLen) return content;
  return content.substring(0, maxLen) + '...';
}

export const MessagesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch {
      // silently fail - will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    websocketService.subscribe('/user/queue/messages', () => {
      loadConversations();
    });

    return () => {
      websocketService.unsubscribe('/user/queue/messages');
    };
  }, [loadConversations]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      Toast.show('已全部标为已读');
    } catch {
      Toast.show('操作失败');
    }
  }, []);

  const handleConversationPress = useCallback((item: Conversation) => {
    navigation.navigate('ActivityTab', {
      screen: 'Chat',
      params: {
        conversationId: item.id,
        friendNickname: item.otherUser?.nickname,
        friendAvatarUrl: item.otherUser?.avatarUrl,
        friendUserId: item.otherUser?.userId ?? 0,
      },
    });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleConversationPress(item)}
      activeOpacity={0.7}
    >
      <Avatar uri={item.otherUser?.avatarUrl} size={48} />
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {item.otherUser?.nickname || '用户'}
          </Text>
          <Text style={styles.conversationTime}>
            {formatTime(item.lastMessage?.createdAt)}
          </Text>
        </View>
        <View style={styles.conversationFooter}>
          <Text style={styles.conversationPreview} numberOfLines={1}>
            {item.lastMessage ? truncateContent(item.lastMessage.content) : '暂无消息'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  ), [handleConversationPress]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>消息</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleMarkAllRead}
              activeOpacity={0.7}
            >
              <IconCheckCircle size={20} color={COLORS.TEXT.PRIMARY} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => Toast.show('功能开发中')}
              activeOpacity={0.7}
            >
              <IconMagnifer size={20} color={COLORS.TEXT.PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={COLORS.PRIMARY} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.iconWrap}>
            <IconChatRoundDots size={48} color={COLORS.TEXT.QUATERNARY} />
          </View>
          <Text style={styles.emptyTitle}>暂无消息</Text>
          <Text style={styles.emptySubtitle}>在好友页面点击"发消息"开始聊天</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadConversations}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    paddingHorizontal: SPACING.XL,
    paddingBottom: SPACING.MD,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XXXL,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
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
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
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
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.XXL,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontWeight: '600',
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.SM,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.TEXT.QUATERNARY,
  },
  listContent: {
    paddingHorizontal: SPACING.XL,
    paddingBottom: 120,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    marginBottom: SPACING.SM,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '500',
    color: COLORS.TEXT.PRIMARY,
    flex: 1,
    marginRight: SPACING.SM,
  },
  conversationTime: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
  },
  conversationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conversationPreview: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.TEXT.TERTIARY,
    flex: 1,
    marginRight: SPACING.SM,
  },
  unreadBadge: {
    backgroundColor: COLORS.PRIMARY,
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
    color: COLORS.TEXT.PRIMARY,
  },
});
