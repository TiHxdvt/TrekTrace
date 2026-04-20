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
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
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
import { useTheme, ThemeMode } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── 三段式主题选择器 ───

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: '自动' },
  { mode: 'light', label: '浅色' },
  { mode: 'dark', label: '深色' },
];

const SELECTOR_HEIGHT = 36;
const SELECTOR_OPTION_WIDTH = 48;
const COLLAPSED_WIDTH = SELECTOR_OPTION_WIDTH;
const EXPANDED_WIDTH = SELECTOR_OPTION_WIDTH * 3;

const ThemeSelector: React.FC<{
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}> = ({ value, onChange, expanded, onExpand, onCollapse }) => {
  const { colors } = useTheme();
  const currentIndex = THEME_OPTIONS.findIndex(o => o.mode === value);

  const containerWidth = useRef(new Animated.Value(COLLAPSED_WIDTH)).current;
  const optionsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const targetWidth = expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;
    const targetOpacity = expanded ? 1 : 0;
    Animated.parallel([
      Animated.timing(containerWidth, {
        toValue: targetWidth,
        duration: 200,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      }),
      Animated.timing(optionsOpacity, {
        toValue: targetOpacity,
        duration: 150,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      }),
    ]).start();
  }, [expanded, containerWidth, optionsOpacity]);

  const handleSelect = useCallback((mode: ThemeMode) => {
    onChange(mode);
    onCollapse();
  }, [onChange, onCollapse]);

  const currentLabel = THEME_OPTIONS[currentIndex].label;

  return (
    <Animated.View
      style={[
        selectorStyles.animatedContainer,
        {
          width: containerWidth,
          height: SELECTOR_HEIGHT,
          backgroundColor: colors.OVERLAY.LIGHT,
          borderColor: colors.BORDER.MEDIUM,
        },
      ]}
    >
      {/* 折叠态 */}
      <Animated.View
        style={[
          selectorStyles.collapsedLayer,
          { opacity: Animated.subtract(new Animated.Value(1), optionsOpacity) },
        ]}
        pointerEvents={expanded ? 'none' : 'auto'}
      >
        <TouchableOpacity
          style={selectorStyles.collapsedTouchable}
          onPress={onExpand}
          activeOpacity={0.7}
        >
          <Text
            style={[
              selectorStyles.optionText,
              { color: colors.TEXT.PRIMARY, fontWeight: '600' },
            ]}
            numberOfLines={1}
          >
            {currentLabel}
          </Text>
        </TouchableOpacity>
      </Animated.View>
      {/* 展开态 */}
      <Animated.View
        style={[selectorStyles.optionsRow, { opacity: optionsOpacity }]}
        pointerEvents={expanded ? 'auto' : 'none'}
      >
        {THEME_OPTIONS.map(({ mode, label }) => {
          const isActive = value === mode;
          return (
            <TouchableOpacity
              key={mode}
              style={selectorStyles.option}
              onPress={() => handleSelect(mode)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  selectorStyles.optionText,
                  {
                    color: isActive ? colors.TEXT.PRIMARY : colors.TEXT.TERTIARY,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </Animated.View>
  );
};

const selectorStyles = StyleSheet.create({
  animatedContainer: {
    borderRadius: BORDER_RADIUS.FULL,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  collapsedLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  collapsedTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsRow: {
    ...StyleSheet.absoluteFillObject,
    width: EXPANDED_WIDTH,
    flexDirection: 'row',
    zIndex: 1,
  },
  option: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
  },
});

// 模块级状态
let _pendingUserData: {
  name: string;
  account: number | null;
  phone: string;
  avatar: string | null;
} | null = null;

function maskPhone(phone: string): string {
  if (phone.length >= 7) return phone.slice(0, 3) + '****' + phone.slice(-4);
  return phone;
}

// ─── 菜单内容 ───

const DrawerContent: React.FC = () => {
  const userData = _pendingUserData;
  const userName = userData?.name ?? '用户';
  const userAccount = userData?.account ?? null;
  const userPhone = userData?.phone ?? '';
  const avatarUrl = userData?.avatar ?? null;
  const { themeMode, setThemeMode, colors } = useTheme();
  const [themeSelectorExpanded, setThemeSelectorExpanded] = useState(false);
  const insets = useSafeAreaInsets();

  const expandThemeSelector = useCallback(() => {
    setThemeSelectorExpanded(true);
  }, []);

  const collapseThemeSelector = useCallback(() => {
    setThemeSelectorExpanded(false);
  }, []);

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

        <TouchableOpacity
          style={styles.menuItem}
          onPress={collapseThemeSelector}
          activeOpacity={1}
        >
          <View style={dynamicStyles.menuIconWrap}><IconMoonStars size={22} color={colors.TEXT.SECONDARY} /></View>
          <Text style={dynamicStyles.menuLabel}>外观</Text>
          <View onStartShouldSetResponder={() => true}>
            <ThemeSelector
              value={themeMode}
              onChange={setThemeMode}
              expanded={themeSelectorExpanded}
              onExpand={expandThemeSelector}
              onCollapse={collapseThemeSelector}
            />
          </View>
        </TouchableOpacity>

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
    DrawerOverlay._animateOpen = async () => {
      // 在组件挂载前预加载用户数据，避免动画中 setState 导致闪烁
      try {
        const user = await storageService.getUser();
        if (user) {
          _pendingUserData = {
            name: user.nickname || '用户',
            account: user.account ?? null,
            phone: user.phone ? maskPhone(user.phone) : '',
            avatar: user.avatarUrl || null,
          };
        }
      } catch {
        // 静默失败
      }
      setVisible(true);
      isOpenRef.current = true;
      DrawerOverlay.isOpen = true;
      Animated.spring(translateX, { toValue: 0, ...springConfig }).start();
    };
    DrawerOverlay._animateClose = (cb?: () => void) => {
      Animated.spring(translateX, { toValue: -SCREEN_WIDTH, ...springConfig }).start(({ finished }) => { if (finished) { isOpenRef.current = false; DrawerOverlay.isOpen = false; setVisible(false); cb?.(); } });
    };
  }, [translateX]);

  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <TouchableOpacity style={styles.tapToClose} activeOpacity={1} onPress={() => DrawerOverlay.close()} />
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
  _animateOpen: async () => {},
  _animateClose: (_cb?: () => void) => {},
};

// ─── 样式 ───

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  tapToClose: {
    ...StyleSheet.absoluteFillObject,
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
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.XL },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.LG,
    paddingVertical: SPACING.LG, paddingHorizontal: SPACING.SM,
  },
  bottomArea: { paddingHorizontal: SPACING.XL },
});
