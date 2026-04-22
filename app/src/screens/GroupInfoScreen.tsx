/**
 * 群聊信息页面
 * 显示群名、成员列表、管理操作
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { Toast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { IconAltArrowLeft } from '../components/SolarIcons';
import { chatService } from '../services/chatService';
import { storageService } from '../services/storageService';

interface Member {
  userId: number;
  nickname?: string;
  avatarUrl?: string;
  role?: string;
}

interface GroupInfoScreenProps {
  navigation: { goBack: () => void };
  route: {
    params: {
      conversationId: number;
      conversationName?: string;
    };
  };
}

export const GroupInfoScreen: React.FC<GroupInfoScreenProps> = ({ navigation, route }) => {
  const { conversationId, conversationName } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState(conversationName || '');

  const loadMembers = useCallback(async () => {
    try {
      const data = await chatService.getMembers(conversationId);
      setMembers(data);
    } catch {
      Toast.show('加载成员失败');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleRename = useCallback(() => {
    Alert.prompt('修改群名', '请输入新的群名', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: async (name?: string) => {
          if (name?.trim()) {
            try {
              await chatService.updateGroupName(conversationId, name.trim());
              setGroupName(name.trim());
              Toast.show('群名已更新');
            } catch {
              Toast.show('修改失败');
            }
          }
        },
      },
    ]);
  }, [conversationId]);

  const handleRemoveMember = useCallback(
    (member: Member) => {
      Alert.alert('确认移除', `确定要移除 ${member.nickname || '该成员'} 吗？`, [
        { text: '取消', style: 'cancel' },
        {
          text: '移除',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.removeMember(conversationId, member.userId);
              setMembers(prev => prev.filter(m => m.userId !== member.userId));
            } catch {
              Toast.show('移除失败');
            }
          },
        },
      ]);
    },
    [conversationId],
  );

  const handleLeaveGroup = useCallback(() => {
    Alert.alert('退出群聊', '确定要退出该群聊吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: async () => {
          try {
            const user = await storageService.getUser();
            if (!user) {
              Toast.show('未登录');
              return;
            }
            await chatService.removeMember(conversationId, user.id);
            Toast.show('已退出群聊');
            navigation.goBack();
          } catch {
            Toast.show('退出失败');
          }
        },
      },
    ]);
  }, [navigation, conversationId]);

  const renderMember = useCallback(
    ({ item }: { item: Member }) => (
      <View style={styles.memberItem}>
        <Avatar uri={item.avatarUrl} size={36} />
        <Text style={[styles.memberName, { color: colors.TEXT.PRIMARY }]} numberOfLines={1}>
          {item.nickname || '用户'}
        </Text>
        {item.role === 'ADMIN' && (
          <View style={[styles.roleTag, { backgroundColor: colors.PRIMARY }]}>
            <Text style={styles.roleTagText}>群主</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.removeBtn, { borderColor: colors.ERROR }]}
          onPress={() => handleRemoveMember(item)}
          activeOpacity={0.7}
        >
          <Text style={[styles.removeBtnText, { color: colors.ERROR }]}>移除</Text>
        </TouchableOpacity>
      </View>
    ),
    [colors, handleRemoveMember],
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.BACKGROUND }]}>
        <ActivityIndicator color={colors.PRIMARY} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <IconAltArrowLeft size={20} color={colors.TEXT.PRIMARY} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.TEXT.PRIMARY }]}>群聊信息</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 群名 */}
      <TouchableOpacity style={[styles.section, { borderBottomColor: colors.BORDER.LIGHT }]} onPress={handleRename} activeOpacity={0.7}>
        <Text style={[styles.sectionLabel, { color: colors.TEXT.TERTIARY }]}>群名称</Text>
        <Text style={[styles.sectionValue, { color: colors.TEXT.PRIMARY }]}>{groupName || '未命名'}</Text>
      </TouchableOpacity>

      {/* 成员列表 */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.TEXT.TERTIARY }]}>
          群成员 ({members.length})
        </Text>
      </View>
      <FlatList
        data={members}
        keyExtractor={item => String(item.userId)}
        renderItem={renderMember}
        contentContainerStyle={styles.memberList}
      />

      {/* 退出群聊 */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.MD }]}>
        <TouchableOpacity
          style={[styles.leaveBtn, { backgroundColor: colors.ERROR }]}
          onPress={handleLeaveGroup}
          activeOpacity={0.7}
        >
          <Text style={styles.leaveBtnText}>退出群聊</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    marginBottom: SPACING.XS,
  },
  sectionValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '500',
  },
  memberList: {
    paddingHorizontal: SPACING.LG,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    gap: SPACING.SM,
  },
  memberName: {
    flex: 1,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
  },
  roleTag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleTagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  removeBtn: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.SM,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  removeBtnText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
  },
  footer: {
    paddingHorizontal: SPACING.LG,
  },
  leaveBtn: {
    borderRadius: BORDER_RADIUS.LG,
    paddingVertical: SPACING.MD,
    alignItems: 'center',
  },
  leaveBtnText: {
    color: '#ffffff',
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '600',
  },
});
