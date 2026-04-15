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

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { storageService } from '../services/storageService';
import { Dialog } from '../components/Dialog';
import { Avatar } from '../components/Avatar';
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
} from '../components/SolarIcons';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavigateFn = (screen: string) => void;

// 模块级状态
let _navigate: NavigateFn | null = null;
let _refreshDrawerData: (() => void) | null = null;

function maskPhone(phone: string): string {
  if (phone.length >= 7) return phone.slice(0, 3) + '****' + phone.slice(-4);
  return phone;
}

// ─── 菜单内容 ───

const DrawerContent: React.FC = () => {
  const [userName, setUserName] = useState('用户');
  const [userPhone, setUserPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { isDarkMode, toggleDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const loadUserData = useCallback(async () => {
    try {
      const user = await storageService.getUser();
      if (user) {
        setUserName(user.nickname || '用户');
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

  // 关闭菜单，完成后跳转子页面
  const go = (screen: string) => {
    DrawerOverlay.close(() => _navigate?.(screen));
  };

  return (
    <View style={[styles.panel, { paddingTop: insets.top }]}>
      {/* 头部 */}
      <View style={styles.header}>
        <View style={styles.userArea}>
          <Avatar uri={avatarUrl} size={64} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userName}</Text>
            {userPhone ? <Text style={styles.userPhone}>{userPhone}</Text> : null}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => DrawerOverlay.close()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <IconCloseCircle size={28} color={COLORS.TEXT.TERTIARY} />
        </TouchableOpacity>
      </View>

      {/* 菜单列表 */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>账户设置</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => go('Notification')} activeOpacity={0.7}>
          <View style={styles.menuIconWrap}><IconBell size={22} color={COLORS.TEXT.SECONDARY} /></View>
          <Text style={styles.menuLabel}>系统通知</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => go('Profile')} activeOpacity={0.7}>
          <View style={styles.menuIconWrap}><IconUserId size={22} color={COLORS.TEXT.SECONDARY} /></View>
          <Text style={styles.menuLabel}>个人信息</Text>
          <IconAltArrowRight size={20} color={COLORS.TEXT.QUINARY} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => go('AccountPrivacy')} activeOpacity={0.7}>
          <View style={styles.menuIconWrap}><IconShieldCheck size={22} color={COLORS.TEXT.SECONDARY} /></View>
          <Text style={styles.menuLabel}>账号隐私</Text>
          <IconAltArrowRight size={20} color={COLORS.TEXT.QUINARY} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => go('Friends')} activeOpacity={0.7}>
          <View style={styles.menuIconWrap}><IconUsersGroupRounded size={22} color={COLORS.TEXT.SECONDARY} /></View>
          <Text style={styles.menuLabel}>同行好友</Text>
          <IconAltArrowRight size={20} color={COLORS.TEXT.QUINARY} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => go('DataManagement')} activeOpacity={0.7}>
          <View style={styles.menuIconWrap}><IconGraphUp size={22} color={COLORS.TEXT.SECONDARY} /></View>
          <Text style={styles.menuLabel}>数据管理</Text>
          <IconAltArrowRight size={20} color={COLORS.TEXT.QUINARY} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: SPACING.XXL }]}>更多</Text>

        <View style={styles.menuItem}>
          <View style={styles.menuIconWrap}><IconMoonStars size={22} color={COLORS.TEXT.SECONDARY} /></View>
          <Text style={styles.menuLabel}>深色模式</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: COLORS.OVERLAY.MEDIUM, true: COLORS.PRIMARY }}
            thumbColor={COLORS.TEXT.PRIMARY}
          />
        </View>

        <TouchableOpacity style={styles.menuItem} onPress={() => go('Permission')} activeOpacity={0.7}>
          <View style={styles.menuIconWrap}><IconSettingsMinimalistic size={22} color={COLORS.TEXT.SECONDARY} /></View>
          <Text style={styles.menuLabel}>系统权限</Text>
          <IconAltArrowRight size={20} color={COLORS.TEXT.QUINARY} />
        </TouchableOpacity>
      </ScrollView>

      {/* 底部退出 */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + SPACING.XXL }]}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <IconLogout size={20} color={COLORS.ERROR} />
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Root 组件 ───

export const DrawerOverlayRoot: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const isOpenRef = useRef(false);
  const translateX = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;


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
      _refreshDrawerData?.();
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, ...springConfig }),
        Animated.spring(backdropOpacity, { toValue: 1, ...springConfig }),
      ]).start();
    };
    DrawerOverlay._animateClose = (cb?: () => void) => {
      isOpenRef.current = false;
      Animated.parallel([
        Animated.spring(translateX, { toValue: -SCREEN_WIDTH, ...springConfig }),
        Animated.spring(backdropOpacity, { toValue: 0, ...springConfig }),
      ]).start(({ finished }) => { if (finished) { setVisible(false); cb?.(); } });
    };
  }, [translateX, backdropOpacity]);

  // 物理返回键：菜单打开时关闭菜单而不是退出 app
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isOpenRef.current) {
        DrawerOverlay.close();
        return true; // 拦截，不退出
      }
      return false;
    });
    return () => handler.remove();
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="auto">
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => DrawerOverlay.close()} />
      </Animated.View>
      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]} pointerEvents="auto">
        <DrawerContent />
      </Animated.View>
    </View>
  );
};

// ─── 静态 API ───

export const DrawerOverlay = {
  open(navigateFn?: NavigateFn) {
    if (navigateFn) _navigate = navigateFn;
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
  drawer: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: SCREEN_WIDTH,
    backgroundColor: COLORS.BACKGROUND,
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
  userName: { fontSize: TYPOGRAPHY.FONT_SIZE.XXL, fontWeight: '700', color: COLORS.TEXT.PRIMARY },
  userInfo: { flex: 1, gap: 4 },
  userPhone: { fontSize: TYPOGRAPHY.FONT_SIZE.BASE, color: COLORS.TEXT.TERTIARY },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.XL },
  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE, fontWeight: '500',
    color: COLORS.TEXT.QUATERNARY, marginBottom: SPACING.MD, marginTop: SPACING.SM,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.LG,
    paddingVertical: SPACING.LG, paddingHorizontal: SPACING.SM,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { flex: 1, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '500', color: COLORS.TEXT.SECONDARY },
  bottomArea: { paddingHorizontal: SPACING.XL },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.SM, paddingVertical: SPACING.MD,
  },
  logoutText: { fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '500', color: COLORS.ERROR },
});
