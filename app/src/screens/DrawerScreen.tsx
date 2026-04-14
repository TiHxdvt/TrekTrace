/**
 * DrawerScreen - 抽屉菜单页面（作为导航页面）
 * 从 Drawer.tsx 改造而来，去掉命令式 overlay，使用 navigation 跳转
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DrawerStackParamList } from '../navigation/DrawerStack';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { storageService } from '../services/storageService';
import { Dialog } from '../components/Dialog';
import { Toast } from '../components/Toast';
import {
  IconUser,
  IconLogout,
  IconGraphUp,
  IconCloseCircle,
  IconBell,
  IconShieldCheck,
  IconUsersGroupRounded,
  IconMoonStars,
  IconSettingsMinimalistic,
  IconUserId,
  IconAltArrowRight,
} from '../components/SolarIcons';
import { useTheme } from '../contexts/ThemeContext';

type DrawerNavigationProp = NativeStackNavigationProp<DrawerStackParamList, 'Drawer'>;

interface Props {
  navigation: DrawerNavigationProp;
}

// Mask phone number: 138****8888
function maskPhone(phone: string): string {
  if (phone.length >= 7) {
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  }
  return phone;
}

export const DrawerScreen: React.FC<Props> = ({ navigation }) => {
  const [userName, setUserName] = useState('用户');
  const [userPhone, setUserPhone] = useState('');
  const { isDarkMode, toggleDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const loadUser = useCallback(async () => {
    const user = await storageService.getUser();
    if (user) {
      setUserName(user.nickname || '用户');
      setUserPhone(user.phone ? maskPhone(user.phone) : '');
    }
  }, []);

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      loadUser();
    });
  }, [loadUser]);

  const handleLogout = () => {
    Dialog.show(
      '退出登录',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出',
          style: 'destructive',
          onPress: async () => {
            await storageService.clearAuthData();
            // 返回主页，auth state 变化会自动跳转到登录页
            navigation.goBack();
          },
        },
      ],
    );
  };

  const showComingSoon = () => {
    Toast.show('功能开发中');
  };

  const closeAndNavigate = (screen: keyof DrawerStackParamList) => {
    navigation.navigate(screen);
  };

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + 16, flex: 1 }}>
        {/* Header: avatar + nickname + close */}
        <View style={styles.header}>
          <View style={styles.userArea}>
            <View style={styles.avatar}>
              <IconUser size={36} color={COLORS.TEXT.SECONDARY} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName}</Text>
              {userPhone ? <Text style={styles.userPhone}>{userPhone}</Text> : null}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <IconCloseCircle size={28} color={COLORS.TEXT.TERTIARY} />
          </TouchableOpacity>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: 账户设置 */}
          <Text style={styles.sectionTitle}>账户设置</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => closeAndNavigate('Notification')} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <IconBell size={22} color={COLORS.TEXT.SECONDARY} />
            </View>
            <Text style={styles.menuLabel}>系统通知</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => closeAndNavigate('Profile')} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <IconUserId size={22} color={COLORS.TEXT.SECONDARY} />
            </View>
            <Text style={styles.menuLabel}>个人信息</Text>
            <IconAltArrowRight size={20} color={COLORS.TEXT.QUINARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => closeAndNavigate('AccountPrivacy')} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <IconShieldCheck size={22} color={COLORS.TEXT.SECONDARY} />
            </View>
            <Text style={styles.menuLabel}>账号隐私</Text>
            <IconAltArrowRight size={20} color={COLORS.TEXT.QUINARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => closeAndNavigate('Friends')} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <IconUsersGroupRounded size={22} color={COLORS.TEXT.SECONDARY} />
            </View>
            <Text style={styles.menuLabel}>同行好友</Text>
            <IconAltArrowRight size={20} color={COLORS.TEXT.QUINARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => closeAndNavigate('DataManagement')} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <IconGraphUp size={22} color={COLORS.TEXT.SECONDARY} />
            </View>
            <Text style={styles.menuLabel}>数据管理</Text>
            <IconAltArrowRight size={20} color={COLORS.TEXT.QUINARY} />
          </TouchableOpacity>

          {/* Section 2: 更多 */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.XXL }]}>更多</Text>

          <View style={styles.menuItem}>
            <View style={styles.menuIconWrap}>
              <IconMoonStars size={22} color={COLORS.TEXT.SECONDARY} />
            </View>
            <Text style={styles.menuLabel}>深色模式</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: COLORS.OVERLAY.MEDIUM, true: COLORS.PRIMARY }}
              thumbColor={COLORS.TEXT.PRIMARY}
            />
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={showComingSoon} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <IconSettingsMinimalistic size={22} color={COLORS.TEXT.SECONDARY} />
            </View>
            <Text style={styles.menuLabel}>系统权限</Text>
            <IconAltArrowRight size={20} color={COLORS.TEXT.QUINARY} />
          </TouchableOpacity>
        </ScrollView>

        {/* Logout at bottom */}
        <View style={[styles.bottomArea, { paddingBottom: insets.bottom + SPACING.XXL }]}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <IconLogout size={20} color={COLORS.ERROR} />
            <Text style={styles.logoutText}>退出登录</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.XL,
    paddingTop: SPACING.XXL,
    paddingBottom: SPACING.XL,
  },
  userArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.LG,
    flex: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XXL,
    fontWeight: '700',
    color: COLORS.TEXT.PRIMARY,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userPhone: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.TEXT.TERTIARY,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.XL,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '500',
    color: COLORS.TEXT.QUATERNARY,
    marginBottom: SPACING.MD,
    marginTop: SPACING.SM,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.LG,
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.SM,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '500',
    color: COLORS.TEXT.SECONDARY,
  },
  bottomArea: {
    paddingHorizontal: SPACING.XL,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
    paddingVertical: SPACING.MD,
  },
  logoutText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '500',
    color: COLORS.ERROR,
  },
});
