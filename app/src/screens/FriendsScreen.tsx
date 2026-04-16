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
  const [tab, setTab] = useState<Tab>('friends');
  const [addMode, setAddMode] = useState<AddMode>('account');
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [requests, setRequests] = useState<FriendRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [addInput, setAddInput] = useState('');
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
        {/* 添加好友 */}
        <View style={styles.card}>
          <View style={styles.addModeRow}>
            <TouchableOpacity
              style={[styles.addModeBtn, addMode === 'account' && styles.addModeBtnActive]}
              onPress={() => { setAddMode('account'); setAddInput(''); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.addModeText, addMode === 'account' && styles.addModeTextActive]}>账号</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addModeBtn, addMode === 'phone' && styles.addModeBtnActive]}
              onPress={() => { setAddMode('phone'); setAddInput(''); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.addModeText, addMode === 'phone' && styles.addModeTextActive]}>手机号</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={addInput}
              onChangeText={setAddInput}
              placeholder={addMode === 'account' ? '输入途迹账号' : '输入手机号'}
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              keyboardType="number-pad"
              maxLength={addMode === 'account' ? 15 : 11}
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
          friends.length === 0 ? (
            <View style={styles.emptyState}>
              <IconUsersGroupRounded size={48} color={COLORS.TEXT.QUINARY} />
              <Text style={styles.emptyText}>暂无好友</Text>
            </View>
          ) : (
            <View style={styles.card}>
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
                      <Text style={styles.friendName}>{friend.nickname || '用户'}</Text>
                      <Text style={styles.friendAccount}>途迹账号：{friend.account ?? '-'}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.chatBtn}
                      onPress={() => handleChatFriend(friend)}
                      activeOpacity={0.7}
                    >
                      <IconChatRoundDots size={20} color={COLORS.TEXT.PRIMARY} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  {index < friends.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          )
        )}

        {/* Requests list */}
        {tab === 'requests' && (
          requests.length === 0 ? (
            <View style={styles.emptyState}>
              <IconUsersGroupRounded size={48} color={COLORS.TEXT.QUINARY} />
              <Text style={styles.emptyText}>暂无好友请求</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {requests.map((req, index) => (
                <React.Fragment key={req.id}>
                  <View style={styles.requestItem}>
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
                  {index < requests.length - 1 && <View style={styles.divider} />}
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
    paddingHorizontal: SPACING.LG,
    marginTop: SPACING.MD,
  },
  addModeRow: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.MD,
    paddingTop: SPACING.LG,
  },
  addModeBtn: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.LG,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.OVERLAY.MEDIUM,
  },
  addModeBtnActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  addModeText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
    fontWeight: '500',
  },
  addModeTextActive: {
    color: COLORS.TEXT.PRIMARY,
  },
  addRow: {
    flexDirection: 'row',
    gap: SPACING.SM,
    paddingBottom: SPACING.LG,
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
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '500',
    color: COLORS.TEXT.SECONDARY,
  },
  friendAccount: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
    marginTop: 2,
  },
  chatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.BORDER.LIGHT,
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
