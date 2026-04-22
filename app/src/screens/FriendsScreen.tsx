/**
 * 同行好友页面
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { FeatureHeader } from '../components/FeatureScreenOverlay';
import { FeatureScreenLayout } from '../components/FeatureScreenLayout';
import {
  friendService,
  FriendData,
  FriendRequestData,
  FriendActivityFeedData,
  NearbyUserData,
} from '../services/friendService';
import { chatService } from '../services/chatService';
import { Dialog } from '../components/Dialog';
import { Toast } from '../components/Toast';
import { IconUsersGroupRounded, IconChatRoundDots } from '../components/SolarIcons';
import { Avatar } from '../components/Avatar';
import { websocketService } from '../services/websocketService';
import { ChatOverlay } from '../components/ChatOverlay';

type NavProp = { goBack: () => void };

type Tab = 'friends' | 'requests' | 'blocked' | 'feed' | 'nearby';
type AddMode = 'account' | 'phone';

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  HIKING: '徒步',
  RUNNING: '跑步',
  CYCLING: '骑行',
};

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}小时前`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return `${diffDay}天前`;
    return `${Math.floor(diffDay / 30)}个月前`;
  } catch {
    return '';
  }
}

function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  try {
    return new Date(expiresAt).getTime() < Date.now();
  } catch {
    return false;
  }
}

export const FriendsScreen: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('friends');
  const [addMode, setAddMode] = useState<AddMode>('account');
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [requests, setRequests] = useState<FriendRequestData[]>([]);
  const [blocked, setBlocked] = useState<FriendData[]>([]);
  const [feedItems, setFeedItems] = useState<FriendActivityFeedData[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [addInput, setAddInput] = useState('');
  const [sending, setSending] = useState(false);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    badge: {
      backgroundColor: colors.ERROR,
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
      color: '#ffffff',
    },
    card: {
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      borderRadius: BORDER_RADIUS.LG,
      paddingHorizontal: SPACING.LG,
      marginTop: SPACING.MD,
    },
    addModeBtn: {
      paddingVertical: SPACING.SM,
      paddingHorizontal: SPACING.LG,
      borderRadius: BORDER_RADIUS.SM,
      backgroundColor: colors.OVERLAY.MEDIUM,
    },
    addModeBtnActive: {
      backgroundColor: colors.PRIMARY,
    },
    addModeText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
      fontWeight: '500',
    },
    addModeTextActive: {
      color: '#ffffff',
    },
    addInput: {
      flex: 1,
      backgroundColor: colors.OVERLAY.MEDIUM,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
      borderRadius: BORDER_RADIUS.MD,
      paddingHorizontal: SPACING.LG,
      paddingVertical: SPACING.MD,
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.PRIMARY,
    },
    addBtn: {
      backgroundColor: colors.PRIMARY,
      borderRadius: BORDER_RADIUS.MD,
      paddingHorizontal: SPACING.XL,
      justifyContent: 'center',
    },
    addBtnText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      fontWeight: '600',
      color: '#ffffff',
    },
    tabBar: {
      flexDirection: 'row',
      marginTop: SPACING.XXL,
      marginBottom: SPACING.MD,
      backgroundColor: colors.OVERLAY.LIGHT,
      borderRadius: BORDER_RADIUS.MD,
      padding: 3,
    },
    tabActive: {
      backgroundColor: colors.OVERLAY.MEDIUM,
    },
    tabText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.XS,
      fontWeight: '500',
      color: colors.TEXT.QUATERNARY,
    },
    tabTextActive: {
      color: colors.TEXT.PRIMARY,
    },
    emptyText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.QUATERNARY,
    },
    friendName: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      fontWeight: '500',
      color: colors.TEXT.SECONDARY,
    },
    friendAccount: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
      marginTop: 2,
    },
    chatBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.OVERLAY.MEDIUM,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
      justifyContent: 'center',
      alignItems: 'center',
    },
    divider: {
      height: 1,
      backgroundColor: colors.BORDER.LIGHT,
    },
    acceptBtn: {
      backgroundColor: colors.PRIMARY,
      borderRadius: BORDER_RADIUS.SM,
      paddingHorizontal: SPACING.LG,
      paddingVertical: SPACING.SM,
    },
    acceptBtnText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      fontWeight: '500',
      color: '#ffffff',
    },
    declineBtn: {
      backgroundColor: colors.OVERLAY.MEDIUM,
      borderRadius: BORDER_RADIUS.SM,
      paddingHorizontal: SPACING.LG,
      paddingVertical: SPACING.SM,
    },
    declineBtnText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      fontWeight: '500',
      color: colors.TEXT.TERTIARY,
    },
    expiredText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      fontWeight: '500',
      color: colors.TEXT.QUATERNARY,
    },
    unblockBtn: {
      backgroundColor: colors.OVERLAY.MEDIUM,
      borderRadius: BORDER_RADIUS.SM,
      paddingHorizontal: SPACING.LG,
      paddingVertical: SPACING.SM,
    },
    unblockBtnText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      fontWeight: '500',
      color: colors.TEXT.TERTIARY,
    },
    feedMeta: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.TERTIARY,
      marginTop: 2,
    },
    feedTime: {
      fontSize: TYPOGRAPHY.FONT_SIZE.XS,
      color: colors.TEXT.QUATERNARY,
      marginTop: 2,
    },
    distanceTag: {
      backgroundColor: colors.OVERLAY.MEDIUM,
      borderRadius: BORDER_RADIUS.SM,
      paddingHorizontal: SPACING.SM,
      paddingVertical: 2,
    },
    distanceText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.XS,
      fontWeight: '500',
      color: colors.PRIMARY,
    },
    nearbyMeta: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
      marginTop: 2,
    },
    actionBtnSmall: {
      backgroundColor: colors.OVERLAY.MEDIUM,
      borderRadius: BORDER_RADIUS.SM,
      paddingHorizontal: SPACING.SM,
      paddingVertical: SPACING.XS,
    },
    actionBtnSmallText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.XS,
      color: colors.TEXT.TERTIARY,
    },
  }), [colors]);

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

  const loadBlocked = useCallback(async () => {
    try {
      const data = await friendService.getBlockedUsers();
      setBlocked(data);
    } catch {
      Toast.show('加载黑名单失败');
    }
  }, []);

  const loadFeed = useCallback(async () => {
    try {
      const data = await friendService.getFriendFeed();
      setFeedItems(data.content);
    } catch {
      Toast.show('加载动态失败');
    }
  }, []);

  const loadNearby = useCallback(async () => {
    try {
      const data = await friendService.getNearbyUsers();
      setNearbyUsers(data);
    } catch {
      Toast.show('加载附近运动者失败');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load tab-specific data when switching tabs
  useEffect(() => {
    if (tab === 'blocked') loadBlocked();
    else if (tab === 'feed') loadFeed();
    else if (tab === 'nearby') loadNearby();
  }, [tab, loadBlocked, loadFeed, loadNearby]);

  // WebSocket: real-time friend request notifications
  useEffect(() => {
    websocketService.subscribe('/user/queue/friend-requests', () => {
      loadData();
    });
    return () => {
      websocketService.unsubscribe('/user/queue/friend-requests');
    };
  }, [loadData]);

  const handleSendRequest = async () => {
    if (!addInput) {
      Toast.show(addMode === 'account' ? '请输入账号' : '请输入手机号');
      return;
    }
    setSending(true);
    try {
      if (addMode === 'account') {
        const accountNum = Number(addInput);
        if (isNaN(accountNum)) { Toast.show('请输入有效的账号'); return; }
        await friendService.sendRequestByAccount(accountNum);
      } else {
        await friendService.sendRequest(addInput);
      }
      Toast.show('好友请求已发送');
      setAddInput('');
    } catch (e: any) {
      Toast.show(e?.response?.data?.error || '发送请求失败');
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await friendService.acceptRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      await loadData();
      Toast.show('已接受好友请求');
    } catch (e: any) {
      Toast.show(e?.response?.data?.error || '操作失败');
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

  const handleBlockFriend = (friend: FriendData) => {
    Dialog.show(
      '拉黑用户',
      `确定要拉黑 ${friend.nickname || '该用户'} 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '拉黑',
          style: 'destructive',
          onPress: async () => {
            try {
              await friendService.blockUser(friend.userId);
              setFriends(prev => prev.filter(f => f.friendshipId !== friend.friendshipId));
              Toast.show('已拉黑');
            } catch {
              Toast.show('操作失败');
            }
          },
        },
      ],
    );
  };

  const handleUnblock = async (user: FriendData) => {
    try {
      await friendService.unblockUser(user.userId);
      setBlocked(prev => prev.filter(b => b.userId !== user.userId));
      Toast.show('已解除屏蔽');
    } catch {
      Toast.show('操作失败');
    }
  };

  const handleChatFriend = async (friend: FriendData) => {
    try {
      const res = await chatService.getOrCreateConversation(friend.userId);
      ChatOverlay.open({
        conversationId: res.conversationId,
        friendNickname: friend.nickname,
        friendAvatarUrl: friend.avatarUrl,
        friendUserId: friend.userId,
      });
    } catch {
      Toast.show('无法发起聊天');
    }
  };

  const handleNearbyAction = (user: NearbyUserData) => {
    Dialog.show(
      user.nickname || '用户',
      `添加好友或拉黑该用户？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '添加好友',
          onPress: async () => {
            try {
              await friendService.sendRequestByAccount(user.account);
              Toast.show('好友请求已发送');
            } catch (e: any) {
              Toast.show(e?.response?.data?.error || '发送失败');
            }
          },
        },
        {
          text: '拉黑',
          style: 'destructive',
          onPress: async () => {
            try {
              await friendService.blockUser(user.userId);
              setNearbyUsers(prev => prev.filter(n => n.userId !== user.userId));
              Toast.show('已拉黑');
            } catch {
              Toast.show('操作失败');
            }
          },
        },
      ],
    );
  };

  const rightEl = requests.length > 0 ? (
    <TouchableOpacity onPress={() => setTab('requests')} activeOpacity={0.7}>
      <View style={dynamicStyles.badge}>
        <Text style={dynamicStyles.badgeText}>{requests.length}</Text>
      </View>
    </TouchableOpacity>
  ) : null;

  if (loading) {
    return (
      <FeatureScreenLayout>
        <FeatureHeader title="同行好友" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.PRIMARY} />
        </View>
      </FeatureScreenLayout>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'friends', label: '好友' },
    { key: 'requests', label: `请求${requests.length > 0 ? `(${requests.length})` : ''}` },
    { key: 'blocked', label: '黑名单' },
    { key: 'feed', label: '动态' },
    { key: 'nearby', label: '附近' },
  ];

  return (
    <FeatureScreenLayout>
      <FeatureHeader title="同行好友" onBack={() => navigation.goBack()} right={rightEl} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 添加好友 */}
        <View style={dynamicStyles.card}>
          <View style={styles.addModeRow}>
            <TouchableOpacity
              style={[dynamicStyles.addModeBtn, addMode === 'account' && dynamicStyles.addModeBtnActive]}
              onPress={() => { setAddMode('account'); setAddInput(''); }}
              activeOpacity={0.7}
            >
              <Text style={[dynamicStyles.addModeText, addMode === 'account' && dynamicStyles.addModeTextActive]}>账号</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dynamicStyles.addModeBtn, addMode === 'phone' && dynamicStyles.addModeBtnActive]}
              onPress={() => { setAddMode('phone'); setAddInput(''); }}
              activeOpacity={0.7}
            >
              <Text style={[dynamicStyles.addModeText, addMode === 'phone' && dynamicStyles.addModeTextActive]}>手机号</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.addRow}>
            <TextInput
              style={dynamicStyles.addInput}
              value={addInput}
              onChangeText={setAddInput}
              placeholder={addMode === 'account' ? '输入途迹账号' : '输入手机号'}
              placeholderTextColor={colors.TEXT.PLACEHOLDER}
              keyboardType="number-pad"
              maxLength={addMode === 'account' ? 15 : 11}
            />
            <TouchableOpacity
              style={[dynamicStyles.addBtn, sending && styles.addBtnDisabled]}
              onPress={handleSendRequest}
              disabled={sending}
              activeOpacity={0.7}
            >
              <Text style={dynamicStyles.addBtnText}>{sending ? '...' : '添加'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab selector */}
        <View style={dynamicStyles.tabBar}>
          {tabs.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && dynamicStyles.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[dynamicStyles.tabText, tab === t.key && dynamicStyles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Friends list */}
        {tab === 'friends' && (
          friends.length === 0 ? (
            <View style={styles.emptyState}>
              <IconUsersGroupRounded size={48} color={colors.TEXT.QUINARY} />
              <Text style={dynamicStyles.emptyText}>暂无好友</Text>
            </View>
          ) : (
            <View style={dynamicStyles.card}>
              {friends.map((friend, index) => (
                <React.Fragment key={friend.friendshipId}>
                  <TouchableOpacity
                    style={styles.friendItem}
                    onLongPress={() => Dialog.show(
                      friend.nickname || '用户',
                      '选择操作',
                      [
                        { text: '取消', style: 'cancel' },
                        { text: '删除好友', style: 'destructive', onPress: () => handleDeleteFriend(friend) },
                        { text: '拉黑', style: 'destructive', onPress: () => handleBlockFriend(friend) },
                      ],
                    )}
                    activeOpacity={0.7}
                    delayLongPress={500}
                  >
                    <Avatar uri={friend.avatarUrl} size={44} />
                    <View style={styles.friendInfo}>
                      <Text style={dynamicStyles.friendName}>{friend.nickname || '用户'}</Text>
                      <Text style={dynamicStyles.friendAccount}>途迹账号：{friend.account ?? '-'}</Text>
                    </View>
                    <TouchableOpacity
                      style={dynamicStyles.chatBtn}
                      onPress={() => handleChatFriend(friend)}
                      activeOpacity={0.7}
                    >
                      <IconChatRoundDots size={20} color={colors.TEXT.PRIMARY} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  {index < friends.length - 1 && <View style={dynamicStyles.divider} />}
                </React.Fragment>
              ))}
            </View>
          )
        )}

        {/* Requests list */}
        {tab === 'requests' && (
          requests.length === 0 ? (
            <View style={styles.emptyState}>
              <IconUsersGroupRounded size={48} color={colors.TEXT.QUINARY} />
              <Text style={dynamicStyles.emptyText}>暂无好友请求</Text>
            </View>
          ) : (
            <View style={dynamicStyles.card}>
              {requests.map((req, index) => {
                const expired = isExpired(req.expiresAt);
                return (
                  <React.Fragment key={req.id}>
                    <View style={[styles.requestItem, expired && { opacity: 0.5 }]}>
                      <Avatar uri={req.requesterAvatarUrl} size={44} />
                      <View style={styles.friendInfo}>
                        <Text style={dynamicStyles.friendName}>{req.requesterNickname || '用户'}</Text>
                      </View>
                      {expired ? (
                        <Text style={dynamicStyles.expiredText}>已过期</Text>
                      ) : (
                        <View style={styles.requestActions}>
                          <TouchableOpacity
                            style={dynamicStyles.acceptBtn}
                            onPress={() => handleAccept(req.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={dynamicStyles.acceptBtnText}>接受</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={dynamicStyles.declineBtn}
                            onPress={() => handleDecline(req.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={dynamicStyles.declineBtnText}>拒绝</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    {index < requests.length - 1 && <View style={dynamicStyles.divider} />}
                  </React.Fragment>
                );
              })}
            </View>
          )
        )}

        {/* Blocked list */}
        {tab === 'blocked' && (
          blocked.length === 0 ? (
            <View style={styles.emptyState}>
              <IconUsersGroupRounded size={48} color={colors.TEXT.QUINARY} />
              <Text style={dynamicStyles.emptyText}>暂无屏蔽用户</Text>
            </View>
          ) : (
            <View style={dynamicStyles.card}>
              {blocked.map((user, index) => (
                <React.Fragment key={user.userId}>
                  <View style={styles.friendItem}>
                    <Avatar uri={user.avatarUrl} size={44} />
                    <View style={styles.friendInfo}>
                      <Text style={dynamicStyles.friendName}>{user.nickname || '用户'}</Text>
                      <Text style={dynamicStyles.friendAccount}>途迹账号：{user.account ?? '-'}</Text>
                    </View>
                    <TouchableOpacity
                      style={dynamicStyles.unblockBtn}
                      onPress={() => handleUnblock(user)}
                      activeOpacity={0.7}
                    >
                      <Text style={dynamicStyles.unblockBtnText}>解除屏蔽</Text>
                    </TouchableOpacity>
                  </View>
                  {index < blocked.length - 1 && <View style={dynamicStyles.divider} />}
                </React.Fragment>
              ))}
            </View>
          )
        )}

        {/* Friend activity feed */}
        {tab === 'feed' && (
          feedItems.length === 0 ? (
            <View style={styles.emptyState}>
              <IconUsersGroupRounded size={48} color={colors.TEXT.QUINARY} />
              <Text style={dynamicStyles.emptyText}>暂无好友动态</Text>
            </View>
          ) : (
            <View style={dynamicStyles.card}>
              {feedItems.map((item, index) => (
                <React.Fragment key={item.activityId}>
                  <TouchableOpacity
                    style={styles.friendItem}
                    activeOpacity={0.7}
                  >
                    <Avatar uri={item.avatarUrl} size={44} />
                    <View style={styles.friendInfo}>
                      <Text style={dynamicStyles.friendName}>{item.nickname || '用户'}</Text>
                      <Text style={dynamicStyles.feedMeta}>
                        {ACTIVITY_TYPE_LABELS[item.activityType] || item.activityType}
                        {item.distance != null ? ` · ${(item.distance / 1000).toFixed(1)}km` : ''}
                        {item.duration != null ? ` · ${Math.round(item.duration / 60)}分钟` : ''}
                      </Text>
                      <Text style={dynamicStyles.feedTime}>
                        {formatRelativeTime(item.startTime)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {index < feedItems.length - 1 && <View style={dynamicStyles.divider} />}
                </React.Fragment>
              ))}
            </View>
          )
        )}

        {/* Nearby users */}
        {tab === 'nearby' && (
          nearbyUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <IconUsersGroupRounded size={48} color={colors.TEXT.QUINARY} />
              <Text style={dynamicStyles.emptyText}>附近暂无运动者</Text>
            </View>
          ) : (
            <View style={dynamicStyles.card}>
              {nearbyUsers.map((user, index) => (
                <React.Fragment key={user.userId}>
                  <TouchableOpacity
                    style={styles.friendItem}
                    onLongPress={() => handleNearbyAction(user)}
                    activeOpacity={0.7}
                    delayLongPress={500}
                  >
                    <Avatar uri={user.avatarUrl} size={44} />
                    <View style={styles.friendInfo}>
                      <Text style={dynamicStyles.friendName}>{user.nickname || '用户'}</Text>
                      {user.lastActivityType && (
                        <Text style={dynamicStyles.nearbyMeta}>
                          最近：{ACTIVITY_TYPE_LABELS[user.lastActivityType] || user.lastActivityType}
                        </Text>
                      )}
                    </View>
                    <View style={dynamicStyles.distanceTag}>
                      <Text style={dynamicStyles.distanceText}>{user.distanceKm}km</Text>
                    </View>
                  </TouchableOpacity>
                  {index < nearbyUsers.length - 1 && <View style={dynamicStyles.divider} />}
                </React.Fragment>
              ))}
            </View>
          )
        )}
      </ScrollView>
    </FeatureScreenLayout>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.XL, paddingBottom: SPACING.XXXL * 2 },
  addModeRow: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.MD,
    paddingTop: SPACING.LG,
  },
  addRow: {
    flexDirection: 'row',
    gap: SPACING.SM,
    paddingBottom: SPACING.LG,
  },
  addBtnDisabled: { opacity: 0.5 },
  tab: {
    flex: 1,
    paddingVertical: SPACING.MD,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.SM,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.XXXL * 2,
    gap: SPACING.LG,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    paddingVertical: SPACING.LG,
  },
  friendInfo: {
    flex: 1,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    paddingVertical: SPACING.LG,
  },
  requestActions: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
});
