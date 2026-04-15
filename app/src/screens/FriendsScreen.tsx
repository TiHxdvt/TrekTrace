/**
 * 同行好友页面
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { FeatureHeader } from '../components/FeatureScreenOverlay';
import { FeatureScreenLayout } from '../components/FeatureScreenLayout';
import { friendService, FriendData, FriendRequestData } from '../services/friendService';
import { Dialog } from '../components/Dialog';
import { Toast } from '../components/Toast';
import { IconUsersGroupRounded } from '../components/SolarIcons';
import { Avatar } from '../components/Avatar';
import { StackNavigationProp } from '@react-navigation/stack';
import { DrawerStackParamList } from '../navigation/DrawerStack';

type NavProp = StackNavigationProp<DrawerStackParamList, 'Friends'>;

type Tab = 'friends' | 'requests';

export const FriendsScreen: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [requests, setRequests] = useState<FriendRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [addPhone, setAddPhone] = useState('');
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([
        friendService.getFriends(),
        friendService.getPendingRequests(),
      ]);
      setFriends(f);
      setRequests(r);
    } catch {
      Toast.show('加载好友数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendRequest = async () => {
    if (!addPhone) {
      Toast.show('请输入手机号');
      return;
    }
    setSending(true);
    try {
      await friendService.sendRequest(addPhone);
      Toast.show('好友请求已发送');
      setAddPhone('');
    } catch {
      Toast.show('发送请求失败');
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await friendService.acceptRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      await loadData(); // refresh friends list
      Toast.show('已接受好友请求');
    } catch {
      Toast.show('操作失败');
    }
  };

  const handleDecline = async (id: number) => {
    try {
      await friendService.declineRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      Toast.show('已拒绝');
    } catch {
      Toast.show('操作失败');
    }
  };

  const handleDeleteFriend = (friend: FriendData) => {
    Dialog.show(
      '删除好友',
      `确定要删除好友 ${friend.nickname || '该用户'} 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await friendService.deleteFriend(friend.friendshipId);
              setFriends(prev => prev.filter(f => f.friendshipId !== friend.friendshipId));
              Toast.show('已删除好友');
            } catch {
              Toast.show('删除失败');
            }
          },
        },
      ],
    );
  };

  const rightEl = requests.length > 0 ? (
    <TouchableOpacity onPress={() => setTab('requests')} activeOpacity={0.7}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{requests.length}</Text>
      </View>
    </TouchableOpacity>
  ) : null;

  if (loading) {
    return (
      <FeatureScreenLayout>
        <FeatureHeader title="同行好友" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.PRIMARY} />
        </View>
      </FeatureScreenLayout>
    );
  }

  return (
    <FeatureScreenLayout>
      <FeatureHeader title="同行好友" onBack={() => navigation.goBack()} right={rightEl} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Add friend */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>添加好友</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={addPhone}
              onChangeText={setAddPhone}
              placeholder="输入手机号"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              keyboardType="phone-pad"
              maxLength={11}
            />
            <TouchableOpacity
              style={[styles.addBtn, sending && styles.addBtnDisabled]}
              onPress={handleSendRequest}
              disabled={sending}
              activeOpacity={0.7}
            >
              <Text style={styles.addBtnText}>{sending ? '...' : '添加'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab selector */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, tab === 'friends' && styles.tabActive]}
            onPress={() => setTab('friends')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>好友</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'requests' && styles.tabActive]}
            onPress={() => setTab('requests')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>
              请求 {requests.length > 0 ? `(${requests.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Friends list */}
        {tab === 'friends' && (
          <View>
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <IconUsersGroupRounded size={48} color={COLORS.TEXT.QUINARY} />
                <Text style={styles.emptyText}>暂无好友</Text>
              </View>
            ) : (
              friends.map(friend => (
                <TouchableOpacity
                  key={friend.friendshipId}
                  style={styles.friendItem}
                  onLongPress={() => handleDeleteFriend(friend)}
                  activeOpacity={0.7}
                  delayLongPress={500}
                >
                  <Avatar uri={friend.avatarUrl} size={44} />
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{friend.nickname || '用户'}</Text>
                    <Text style={styles.friendPhone}>{friend.phone}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Requests list */}
        {tab === 'requests' && (
          <View>
            {requests.length === 0 ? (
              <View style={styles.emptyState}>
                <IconUsersGroupRounded size={48} color={COLORS.TEXT.QUINARY} />
                <Text style={styles.emptyText}>暂无好友请求</Text>
              </View>
            ) : (
              requests.map(req => (
                <View key={req.id} style={styles.requestItem}>
                  <Avatar uri={req.requesterAvatarUrl} size={44} />
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{req.requesterNickname || '用户'}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAccept(req.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.acceptBtnText}>接受</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => handleDecline(req.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.declineBtnText}>拒绝</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </FeatureScreenLayout>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.XL, paddingBottom: SPACING.XXXL * 2 },
  badge: {
    backgroundColor: COLORS.ERROR,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  card: {
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    marginTop: SPACING.MD,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '500',
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.MD,
  },
  addRow: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  addInput: {
    flex: 1,
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    color: COLORS.TEXT.PRIMARY,
  },
  addBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.XL,
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  tabBar: {
    flexDirection: 'row',
    marginTop: SPACING.XXL,
    marginBottom: SPACING.MD,
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderRadius: BORDER_RADIUS.MD,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.MD,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.SM,
  },
  tabActive: {
    backgroundColor: COLORS.OVERLAY.MEDIUM,
  },
  tabText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '500',
    color: COLORS.TEXT.QUATERNARY,
  },
  tabTextActive: {
    color: COLORS.TEXT.PRIMARY,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.XXXL * 2,
    gap: SPACING.LG,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    color: COLORS.TEXT.QUATERNARY,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.LIGHT,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '500',
    color: COLORS.TEXT.SECONDARY,
  },
  friendPhone: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
    marginTop: 2,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.LIGHT,
  },
  requestActions: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  acceptBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: BORDER_RADIUS.SM,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
  },
  acceptBtnText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.TEXT.PRIMARY,
  },
  declineBtn: {
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    borderRadius: BORDER_RADIUS.SM,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
  },
  declineBtnText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.TEXT.TERTIARY,
  },
});
