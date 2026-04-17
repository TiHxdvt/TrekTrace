/**
 * 系统通知页面
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { FeatureHeader } from '../components/FeatureScreenOverlay';
import { FeatureScreenLayout } from '../components/FeatureScreenLayout';
import { notificationService, NotificationItem } from '../services/notificationService';
import { Toast } from '../components/Toast';
import { IconBell, IconCheckCircle } from '../components/SolarIcons';

type NavProp = { goBack: () => void };

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'ACTIVITY_SUMMARY': return '📋';
    case 'MILESTONE': return '🏆';
    case 'FRIEND_REQUEST': return '👤';
    default: return '📢';
  }
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return d.toLocaleDateString('zh-CN');
}

export const NotificationScreen: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    emptyText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.QUATERNARY,
    },
    notificationCard: {
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      borderRadius: BORDER_RADIUS.LG,
      padding: SPACING.LG,
      marginTop: SPACING.MD,
    },
    unreadCard: {
      borderColor: colors.BORDER.HEAVY,
      backgroundColor: colors.OVERLAY.MEDIUM,
    },
    cardTitle: {
      flex: 1,
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      fontWeight: '600',
      color: colors.TEXT.PRIMARY,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.PRIMARY,
    },
    cardContent: {
      fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
      color: colors.TEXT.TERTIARY,
      lineHeight: TYPOGRAPHY.FONT_SIZE.BASE * TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    },
    cardTime: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUINARY,
      marginTop: SPACING.SM,
    },
  }), [colors]);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch {
      Toast.show('加载通知失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleReadAll = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      Toast.show('已全部标为已读');
    } catch {
      Toast.show('操作失败');
    }
  };

  const handlePress = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await notificationService.markAsRead(item.id);
        setNotifications(prev =>
          prev.map(n => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
      } catch {
        Toast.show('标记已读失败');
      }
    }
  };

  const rightEl = (
    <TouchableOpacity onPress={handleReadAll} activeOpacity={0.7}>
      <IconCheckCircle size={22} color={colors.TEXT.TERTIARY} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <FeatureScreenLayout>
        <FeatureHeader title="系统通知" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.PRIMARY} />
        </View>
      </FeatureScreenLayout>
    );
  }

  return (
    <FeatureScreenLayout>
      <FeatureHeader title="系统通知" onBack={() => navigation.goBack()} right={rightEl} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.TEXT.TERTIARY} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <IconBell size={48} color={colors.TEXT.QUINARY} />
            <Text style={dynamicStyles.emptyText}>暂无通知</Text>
          </View>
        ) : (
          notifications.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[dynamicStyles.notificationCard, !item.isRead && dynamicStyles.unreadCard]}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{getNotificationIcon(item.type)}</Text>
                <Text style={dynamicStyles.cardTitle} numberOfLines={1}>{item.title}</Text>
                {!item.isRead && <View style={dynamicStyles.unreadDot} />}
              </View>
              <Text style={dynamicStyles.cardContent} numberOfLines={2}>{item.content}</Text>
              <Text style={dynamicStyles.cardTime}>{formatTime(item.createdAt)}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </FeatureScreenLayout>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.XL, paddingBottom: SPACING.XXXL * 2 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.XXXL * 3,
    gap: SPACING.LG,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  cardIcon: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
  },
});
