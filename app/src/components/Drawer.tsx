/**
 * Drawer 组件 - 左侧滑出抽屉菜单
 * 提供命令式 Drawer.open() / Drawer.close() API
 * 玻璃拟态风格，和 Dialog / Toast 同模式
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY, SPACING, ANIMATION } from '../theme';
import { storageService } from '../services/storageService';
import { Dialog } from './Dialog';
import { Toast } from './Toast';
import {
  IconUser,
  IconSettings,
  IconLogout,
  IconCompass,
  IconGraphUp,
  IconLayersBold,
} from './SolarIcons';
import { MapType } from 'react-native-amap3d';

const APP_VERSION = 'v1.0.0';

const DRAWER_WIDTH = 280;

// Map type options
interface MapTypeOption {
  key: string;
  label: string;
  value: MapType;
}

const MAP_TYPE_OPTIONS: MapTypeOption[] = [
  { key: 'night', label: '夜间', value: MapType.Night },
  { key: 'standard', label: '标准', value: MapType.Standard },
  { key: 'satellite', label: '卫星', value: MapType.Satellite },
];

// Callbacks type for communication with ActivityScreen
interface DrawerCallbacks {
  onStartSimulation?: (routeId: string) => void;
  onStopSimulation?: () => void;
  onChangeMapType?: (type: MapType) => void;
  onLogout?: () => void;
  getIsSimulating?: () => boolean;
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
  const [selectedMapType, setSelectedMapType] = useState<string>('night');
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH));
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
    slideAnim.current.setValue(-DRAWER_WIDTH);
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
        toValue: -DRAWER_WIDTH,
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

  const handleGpsSim = () => {
    if (callbacks.getIsSimulating?.()) {
      callbacks.onStopSimulation?.();
      closeDrawer();
    } else {
      // 动态 require 避免 mockLocationService 被打入生产包
      const { MOCK_ROUTES } = require('../services/mockLocationService');
      const routeKeys = Object.keys(MOCK_ROUTES);
      const routeOptions = routeKeys.map((key: string) => MOCK_ROUTES[key].name);

      closeDrawer();
      setTimeout(() => {
        Dialog.show(
          'GPS 模拟',
          '选择模拟路线：',
          [
            ...routeOptions.map((name: string, idx: number) => ({
              text: name,
              onPress: () => callbacks.onStartSimulation?.(routeKeys[idx]),
            })),
            { text: '取消', style: 'cancel' },
          ],
        );
      }, ANIMATION.NORMAL);
    }
  };

  const handleMapType = (option: MapTypeOption) => {
    setSelectedMapType(option.key);
    callbacks.onChangeMapType?.(option.value);
  };

  const handleExport = () => {
    Toast.show('即将推出');
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Mask */}
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={closeDrawer}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'rgba(0, 0, 0, 0.5)', opacity: maskAnim.current },
          ]}
        />
      </Pressable>

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            paddingTop: insets.top + 16,
            transform: [{ translateX: slideAnim.current }],
          },
        ]}
      >
        {/* User Area */}
        <View style={styles.userArea}>
          <View style={styles.avatar}>
            <IconUser size={24} color={COLORS.TEXT.SECONDARY} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userName}</Text>
            {userPhone ? <Text style={styles.userPhone}>{userPhone}</Text> : null}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {/* GPS Simulation (DEV only) */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleGpsSim}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconWrap}>
                <IconCompass size={20} color={COLORS.TEXT.SECONDARY} />
              </View>
              <Text style={styles.menuLabel}>
                {callbacks.getIsSimulating?.() ? '停止 GPS 模拟' : 'GPS 模拟'}
              </Text>
              <Text style={styles.menuBadge}>DEV</Text>
            </TouchableOpacity>
          )}

          {/* Map Settings */}
          <View style={styles.menuItem}>
            <View style={styles.menuIconWrap}>
              <IconLayersBold size={20} color={COLORS.TEXT.SECONDARY} />
            </View>
            <Text style={styles.menuLabel}>地图设置</Text>
          </View>
          <View style={styles.mapTypeRow}>
            {MAP_TYPE_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.mapTypeChip,
                  selectedMapType === option.key && styles.mapTypeChipActive,
                ]}
                onPress={() => handleMapType(option)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.mapTypeChipText,
                    selectedMapType === option.key && styles.mapTypeChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Data Export */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleExport}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconWrap}>
              <IconGraphUp size={20} color={COLORS.TEXT.SECONDARY} />
            </View>
            <Text style={styles.menuLabel}>数据导出</Text>
          </TouchableOpacity>

          {/* About */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Toast.show(`途迹 TrekTrace ${APP_VERSION}`);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconWrap}>
              <IconSettings size={20} color={COLORS.TEXT.SECONDARY} />
            </View>
            <Text style={styles.menuLabel}>关于</Text>
            <Text style={styles.menuVersion}>{APP_VERSION}</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Area */}
        <View style={styles.bottomArea}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <IconLogout size={18} color={COLORS.ERROR} />
            <Text style={styles.logoutText}>退出登录</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>{APP_VERSION}</Text>
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
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: COLORS.BACKGROUND,
    borderRightWidth: 1,
    borderRightColor: COLORS.BORDER.MEDIUM,
    paddingHorizontal: SPACING.LG,
  },

  // User Area
  userArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    paddingVertical: SPACING.LG,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userPhone: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.TERTIARY,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.BORDER.LIGHT,
    marginBottom: SPACING.LG,
  },

  // Menu Section
  menuSection: {
    gap: SPACING.XS,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.G2.SM,
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
  },
  menuIconWrap: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '500',
    color: COLORS.TEXT.SECONDARY,
  },
  menuBadge: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '600',
    color: COLORS.WARNING,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  menuVersion: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.TEXT.QUINARY,
  },

  // Map type selector
  mapTypeRow: {
    flexDirection: 'row',
    gap: SPACING.SM,
    paddingLeft: 36 + SPACING.MD, // align with menu text
    marginBottom: SPACING.SM,
  },
  mapTypeChip: {
    paddingVertical: SPACING.XS,
    paddingHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.G2.SM,
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
  },
  mapTypeChipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  mapTypeChipText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.TERTIARY,
    fontWeight: '500',
  },
  mapTypeChipTextActive: {
    color: COLORS.TEXT.PRIMARY,
  },

  // Bottom Area
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.LG,
    paddingBottom: SPACING.XXL,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.G2.SM,
    backgroundColor: COLORS.ERROR_OVERLAY.BUTTON_BG,
    borderWidth: 1,
    borderColor: COLORS.ERROR_OVERLAY.BUTTON_BORDER,
    marginBottom: SPACING.MD,
  },
  logoutText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.ERROR,
  },
  versionText: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.TEXT.QUINARY,
  },
});
