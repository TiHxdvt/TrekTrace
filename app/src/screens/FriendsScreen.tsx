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
import { friendService, FriendData, FriendRequestData } from '../services/friendService';
import { chatService } from '../services/chatService';
import { Dialog } from '../components/Dialog';
import { Toast } from '../components/Toast';
import { IconUsersGroupRounded, IconChatRoundDots } from '../components/SolarIcons';
import { Avatar } from '../components/Avatar';
import { websocketService } from '../services/websocketService';
import { ChatOverlay } from '../components/ChatOverlay';

type NavProp = { goBack: () => void };

type Tab = 'friends' | 'requests';
type AddMode = 'account' | 'phone';

export const FriendsScreen: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('friends');
  const [addMode, setAddMode] = useState<AddMode>('account');
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [requests, setRequests] = useState<FriendRequestData[]>([]);
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
      fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
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

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          <TouchableOpacity
            style={[styles.tab, tab === 'friends' && dynamicStyles.tabActive]}
            onPress={() => setTab('friends')}
            activeOpacity={0.7}
          >
            <Text style={[dynamicStyles.tabText, tab === 'friends' && dynamicStyles.tabTextActive]}>好友</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'requests' && dynamicStyles.tabActive]}
            onPress={() => setTab('requests')}
            activeOpacity={0.7}
          >
            <Text style={[dynamicStyles.tabText, tab === 'requests' && dynamicStyles.tabTextActive]}>
              请求 {requests.length > 0 ? `(${requests.length})` : ''}
            </Text>
          </TouchableOpacity>
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
                    onLongPress={() => handleDeleteFriend(friend)}
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
              {requests.map((req, index) => (
                <React.Fragment key={req.id}>
                  <View style={styles.requestItem}>
                    <Avatar uri={req.requesterAvatarUrl} size={44} />
                    <View style={styles.friendInfo}>
                      <Text style={dynamicStyles.friendName}>{req.requesterNickname || '用户'}</Text>
                    </View>
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
                  </View>
                  {index < requests.length - 1 && <View style={dynamicStyles.divider} />}
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
