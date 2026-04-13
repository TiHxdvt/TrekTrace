/**
 * Drawer 组件 - 全屏设置页
 * 从左侧滑入，全屏模糊背景
 * 玻璃拟态风格，与 Dialog / Toast 同模式
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Switch,
  Pressable,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING, ANIMATION } from '../theme';
import { storageService } from '../services/storageService';
import { Dialog } from './Dialog';
import { Toast } from './Toast';
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
} from './SolarIcons';
import { useTheme } from '../contexts/ThemeContext';

// Callbacks type for communication with ActivityScreen
interface DrawerCallbacks {
  onLogout?: () => void;
}

// Module-level state for imperative API
let openFn: (() => void) | null = null;
let closeFn: (() => void) | null = null;
let callbacks: DrawerCallbacks = {};

export const Drawer = {
  open() {
    if (openFn) {
      openFn();
    } else if (__DEV__) {
      console.warn('Drawer.open() called before DrawerRoot was mounted');
    }
  },

  close() {
    if (closeFn) {
      closeFn();
    }
  },

  setCallbacks(cbs: DrawerCallbacks) {
    callbacks = cbs;
  },
};

// Mask phone number: 138****8888
function maskPhone(phone: string): string {
  if (phone.length >= 7) {
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  }
  return phone;
}

export const DrawerRoot: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [userName, setUserName] = useState('用户');
  const [userPhone, setUserPhone] = useState('');
  const { isDarkMode, toggleDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(-500));
  const maskAnim = useRef(new Animated.Value(0));

  // Load user info when drawer opens
  const loadUser = useCallback(async () => {
    const user = await storageService.getUser();
    if (user) {
      setUserName(user.nickname || '用户');
      setUserPhone(user.phone ? maskPhone(user.phone) : '');
    }
  }, []);

  const openDrawer = useCallback(() => {
    loadUser();
    setVisible(true);
    slideAnim.current.setValue(-500);
    maskAnim.current.setValue(0);

    Animated.parallel([
      Animated.timing(slideAnim.current, {
        toValue: 0,
        duration: ANIMATION.NORMAL,
        useNativeDriver: true,
      }),
      Animated.timing(maskAnim.current, {
        toValue: 1,
        duration: ANIMATION.NORMAL,
        useNativeDriver: true,
      }),
    ]).start();
  }, [loadUser]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim.current, {
        toValue: -500,
        duration: ANIMATION.NORMAL,
        useNativeDriver: true,
      }),
      Animated.timing(maskAnim.current, {
        toValue: 0,
        duration: ANIMATION.NORMAL,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  }, []);

  useEffect(() => {
    openFn = openDrawer;
    closeFn = closeDrawer;
    return () => {
      openFn = null;
      closeFn = null;
    };
  }, [openDrawer, closeDrawer]);

  const handleLogout = () => {
    closeDrawer();
    setTimeout(() => {
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
              callbacks.onLogout?.();
            },
          },
        ],
      );
    }, ANIMATION.NORMAL);
  };

  const showComingSoon = () => {
    Toast.show('功能开发中');
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Static background layer (fades in/out) */}
      <Animated.View style={[styles.bgLayer, { opacity: maskAnim.current }]}>
        {/* Background glow orbs */}
        <View style={styles.ambientGlow} pointerEvents="none">
          <View style={[styles.glowOrb, styles.glowOrbTop]} />
          <View style={[styles.glowOrb, styles.glowOrbCenter]} />
          <View style={[styles.glowOrb, styles.glowOrbBottom]} />
        </View>

        {/* Blur layer over glow orbs */}
        <View style={styles.blurLayer} pointerEvents="none">
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurRadius={24}
            overlayColor={COLORS.OVERLAY.CARD}
            blurType="dark"
            blurAmount={24}
          />
        </View>
      </Animated.View>

      {/* Mask - tap to close */}
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={closeDrawer}
      />

      {/* Content layer - slides in from left */}
      <Animated.View
        style={[
          styles.contentLayer,
          { paddingTop: insets.top + 16, transform: [{ translateX: slideAnim.current }] },
        ]}
      >
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
            onPress={closeDrawer}
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

          <TouchableOpacity style={styles.menuItem} onPress={showComingSoon} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <IconBell size={22} color={COLORS.TEXT.SECONDARY} />
            </View>
            <Text style={styles.menuLabel}>系统通知</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={showComingSoon} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <IconUserId size={22} color={COLORS.TEXT.SECONDARY} />
            </View>
            <Text style={styles.menuLabel}>个人信息</Text>
            <IconAltArrowRight size={20} color={COLORS.TEXT.QUINARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={showComingSoon} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <IconShieldCheck size={22} color={COLORS.TEXT.SECONDARY} />
            </View>
            <Text style={styles.menuLabel}>账号隐私</Text>
            <IconAltArrowRight size={20} color={COLORS.TEXT.QUINARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={showComingSoon} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <IconUsersGroupRounded size={22} color={COLORS.TEXT.SECONDARY} />
            </View>
            <Text style={styles.menuLabel}>同行好友</Text>
            <IconAltArrowRight size={20} color={COLORS.TEXT.QUINARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={showComingSoon} activeOpacity={0.7}>
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
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9000,
    elevation: 9000,
  },

  // Static background layer (fades in/out with mask anim)
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.BACKGROUND,
    zIndex: 0,
  },

  // Background glow orbs (same style as ActivityScreen)
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  glowOrbTop: {
    top: -80,
    right: -40,
    width: 300,
    height: 300,
    backgroundColor: COLORS.GRADIENT.BLUE,
  },
  glowOrbCenter: {
    top: '40%',
    left: '50%',
    transform: [{ translateX: -150 }],
    width: 400,
    height: 400,
    backgroundColor: COLORS.GRADIENT.PINK,
  },
  glowOrbBottom: {
    bottom: -80,
    left: -60,
    width: 500,
    height: 500,
    backgroundColor: COLORS.GRADIENT.PURPLE,
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  // Content layer - slides in from left, no background (bg layer underneath)
  contentLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },

  // Header
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

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.XL,
  },

  // Section title
  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '500',
    color: COLORS.TEXT.QUATERNARY,
    marginBottom: SPACING.MD,
    marginTop: SPACING.SM,
  },

  // Menu item - no background
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

  // Bottom Area - logout pinned to bottom
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
