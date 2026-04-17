/**
 * DrawerOverlay — 抽屉菜单覆盖层
 *
 * 最常见的菜单模式：从左侧滑入，盖住首页。
 * 点击菜单项 → 菜单关闭 → 子页面 push 进来。
 *
 * 用法：
 *   DrawerOverlay.open(navigateFn)  — 打开
 *   DrawerOverlay.close(callback)   — 关闭
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TYPOGRAPHY, SPACING } from '../theme';
import { storageService } from '../services/storageService';
import { Dialog } from '../components/Dialog';
import { Avatar } from '../components/Avatar';
import { SubScreenOverlay, SubScreenName } from '../components/SubScreenOverlay';
import {
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
  IconQrCode,
} from '../components/SolarIcons';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 模块级状态
let _refreshDrawerData: (() => void) | null = null;

function maskPhone(phone: string): string {
  if (phone.length >= 7) return phone.slice(0, 3) + '****' + phone.slice(-4);
  return phone;
}

// ─── 菜单内容 ───

const DrawerContent: React.FC = () => {
  const [userName, setUserName] = useState('用户');
  const [userAccount, setUserAccount] = useState<number | null>(null);
  const [userPhone, setUserPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { isDarkMode, toggleDarkMode, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const dynamicStyles = useMemo(() => StyleSheet.create({
    drawer: {
      position: 'absolute',
      left: 0, top: 0, bottom: 0,
      width: SCREEN_WIDTH,
      backgroundColor: colors.BACKGROUND,
    },
    userName: { fontSize: TYPOGRAPHY.FONT_SIZE.XXL, fontWeight: '700', color: colors.TEXT.PRIMARY },
    userAccount: { fontSize: TYPOGRAPHY.FONT_SIZE.SM, color: colors.TEXT.QUATERNARY },
    accountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sectionTitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.BASE, fontWeight: '500',
      color: colors.TEXT.QUATERNARY, marginBottom: SPACING.MD, marginTop: SPACING.SM,
    },
    menuIconWrap: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.OVERLAY.MEDIUM,
      justifyContent: 'center', alignItems: 'center',
    },
    menuLabel: { flex: 1, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '500', color: colors.TEXT.SECONDARY },
    logoutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: SPACING.SM, paddingVertical: SPACING.MD,
    },
    logoutText: { fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '500', color: colors.ERROR },
  }), [colors]);

  const loadUserData = useCallback(async () => {
    try {
      const user = await storageService.getUser();
      if (user) {
        setUserName(user.nickname || '用户');
        setUserAccount(user.account ?? null);
        setUserPhone(user.phone ? maskPhone(user.phone) : '');
        setAvatarUrl(user.avatarUrl || null);
      }
    } catch {
      // 静默失败，保持默认值
    }
  }, []);

  useEffect(() => {
    InteractionManager.runAfterInteractions(loadUserData);
    // 注册刷新函数，每次抽屉打开时调用
    _refreshDrawerData = loadUserData;
    return () => { _refreshDrawerData = null; };
  }, [loadUserData]);

  const handleLogout = () => {
    Dialog.show('退出登录', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: async () => {
          await storageService.clearAuthData();
          DrawerOverlay.close();
        },
      },
    ]);
  };

  // 关闭菜单，完成后打开子页面 overlay
  const go = (screen: SubScreenName) => {
    DrawerOverlay.close(() => SubScreenOverlay.open(screen));
  };

  return (
    <View style={[styles.panel, { paddingTop: insets.top }]}>
      {/* 头部 */}
      <View style={styles.header}>
        <View style={styles.userArea}>
          <Avatar uri={avatarUrl} size={64} />
          <View style={styles.userInfo}>
            <Text style={dynamicStyles.userName}>{userName}</Text>
            {userAccount ? (
              <View style={dynamicStyles.accountRow}>
                <Text style={dynamicStyles.userAccount}>途迹账号：{userAccount}</Text>
                <IconQrCode size={14} color={colors.TEXT.QUATERNARY} />
              </View>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => DrawerOverlay.close()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <IconCloseCircle size={28} color={colors.TEXT.TERTIARY} />
        </TouchableOpacity>
      </View>

      {/* 菜单列表 */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={dynamicStyles.sectionTitle}>账户设置</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => go('Notification')} activeOpacity={0.7}>
          <View style={dynamicStyles.menuIconWrap}><IconBell size={22} color={colors.TEXT.SECONDARY} /></View>
          <Text style={dynamicStyles.menuLabel}>系统通知</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => go('Profile')} activeOpacity={0.7}>
          <View style={dynamicStyles.menuIconWrap}><IconUserId size={22} color={colors.TEXT.SECONDARY} /></View>
          <Text style={dynamicStyles.menuLabel}>个人信息</Text>
          <IconAltArrowRight size={20} color={colors.TEXT.QUINARY} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => go('AccountPrivacy')} activeOpacity={0.7}>
          <View style={dynamicStyles.menuIconWrap}><IconShieldCheck size={22} color={colors.TEXT.SECONDARY} /></View>
          <Text style={dynamicStyles.menuLabel}>账号隐私</Text>
          <IconAltArrowRight size={20} color={colors.TEXT.QUINARY} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => go('Friends')} activeOpacity={0.7}>
          <View style={dynamicStyles.menuIconWrap}><IconUsersGroupRounded size={22} color={colors.TEXT.SECONDARY} /></View>
          <Text style={dynamicStyles.menuLabel}>同行好友</Text>
          <IconAltArrowRight size={20} color={colors.TEXT.QUINARY} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => go('DataManagement')} activeOpacity={0.7}>
          <View style={dynamicStyles.menuIconWrap}><IconGraphUp size={22} color={colors.TEXT.SECONDARY} /></View>
          <Text style={dynamicStyles.menuLabel}>数据管理</Text>
          <IconAltArrowRight size={20} color={colors.TEXT.QUINARY} />
        </TouchableOpacity>

        <Text style={[dynamicStyles.sectionTitle, { marginTop: SPACING.XXL }]}>更多</Text>

        <View style={styles.menuItem}>
          <View style={dynamicStyles.menuIconWrap}><IconMoonStars size={22} color={colors.TEXT.SECONDARY} /></View>
          <Text style={dynamicStyles.menuLabel}>深色模式</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: colors.OVERLAY.MEDIUM, true: colors.PRIMARY }}
            thumbColor={colors.TEXT.PRIMARY}
          />
        </View>

        <TouchableOpacity style={styles.menuItem} onPress={() => go('Permission')} activeOpacity={0.7}>
          <View style={dynamicStyles.menuIconWrap}><IconSettingsMinimalistic size={22} color={colors.TEXT.SECONDARY} /></View>
          <Text style={dynamicStyles.menuLabel}>系统权限</Text>
          <IconAltArrowRight size={20} color={colors.TEXT.QUINARY} />
        </TouchableOpacity>
      </ScrollView>

      {/* 底部退出 */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + SPACING.XXL }]}>
        <TouchableOpacity style={dynamicStyles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <IconLogout size={20} color={colors.ERROR} />
          <Text style={dynamicStyles.logoutText}>退出登录</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Root 组件 ───

export const DrawerOverlayRoot: React.FC = () => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const isOpenRef = useRef(false);
  const translateX = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const dynamicStyles = useMemo(() => StyleSheet.create({
    drawer: {
      position: 'absolute',
      left: 0, top: 0, bottom: 0,
      width: SCREEN_WIDTH,
      backgroundColor: colors.BACKGROUND,
    },
  }), [colors]);

  // iOS 风格弹簧动画参数
  const springConfig = {
    damping: 28,
    stiffness: 350,
    mass: 0.8,
    overshootClamping: true,
    useNativeDriver: true,
  } as const;

  useEffect(() => {
    DrawerOverlay._animateOpen = () => {
      setVisible(true);
      isOpenRef.current = true;
      DrawerOverlay.isOpen = true;
      _refreshDrawerData?.();
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, ...springConfig }),
        Animated.spring(backdropOpacity, { toValue: 1, ...springConfig }),
      ]).start();
    };
    DrawerOverlay._animateClose = (cb?: () => void) => {
      Animated.parallel([
        Animated.spring(translateX, { toValue: -SCREEN_WIDTH, ...springConfig }),
        Animated.spring(backdropOpacity, { toValue: 0, ...springConfig }),
      ]).start(({ finished }) => { if (finished) { isOpenRef.current = false; DrawerOverlay.isOpen = false; setVisible(false); cb?.(); } });
    };
  }, [translateX, backdropOpacity]);

  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="auto">
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => DrawerOverlay.close()} />
      </Animated.View>
      <Animated.View style={[dynamicStyles.drawer, { transform: [{ translateX }] }]} pointerEvents="auto">
        <DrawerContent />
      </Animated.View>
    </View>
  );
};

// ─── 静态 API ───

export const DrawerOverlay = {
  isOpen: false,
  open() {
    // Use InteractionManager to wait for the component to mount and register _animateOpen
    InteractionManager.runAfterInteractions(() => {
      this._animateOpen?.();
    });
  },
  close(callback?: () => void) {
    this._animateClose?.(callback);
  },
  _animateOpen: () => {},
  _animateClose: (_cb?: () => void) => {},
};

// ─── 样式 ───

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.XL,
    paddingTop: SPACING.XXL,
    paddingBottom: SPACING.XL,
  },
  userArea: { flexDirection: 'row', alignItems: 'center', gap: SPACING.LG, flex: 1 },
  userInfo: { flex: 1, gap: 4 },
  userPhone: { fontSize: TYPOGRAPHY.FONT_SIZE.BASE },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.XL },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.LG,
    paddingVertical: SPACING.LG, paddingHorizontal: SPACING.SM,
  },
  bottomArea: { paddingHorizontal: SPACING.XL },
});
