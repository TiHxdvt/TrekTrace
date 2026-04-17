/**
 * 系统权限页面
 * 展示当前 App 所需权限的获取状态，支持点击重新请求
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { FeatureHeader } from '../components/FeatureScreenOverlay';
import { FeatureScreenLayout } from '../components/FeatureScreenLayout';
import { Dialog } from '../components/Dialog';
import { IconShieldCheck, IconShieldCross } from '../components/SolarIcons';

type NavProp = { goBack: () => void };

interface PermItem {
  key: string;
  label: string;
  desc: string;
  androidPerm: string;
  iosDesc: string;
}

const PERMS: PermItem[] = [
  {
    key: 'location',
    label: '位置信息',
    desc: '用于记录运动轨迹和展示地图',
    androidPerm: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    iosDesc: 'NSLocationWhenInUseUsageDescription',
  },
  {
    key: 'camera',
    label: '相机',
    desc: '用于拍摄头像照片',
    androidPerm: PermissionsAndroid.PERMISSIONS.CAMERA,
    iosDesc: 'NSCameraUsageDescription',
  },
  {
    key: 'storage',
    label: '存储',
    desc: '用于保存运动轨迹卡片到相册',
    androidPerm: PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    iosDesc: 'NSPhotoLibraryAddUsageDescription',
  },
];

export const PermissionScreen: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [granted, setGranted] = useState<Record<string, boolean> | null>(null);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      borderRadius: BORDER_RADIUS.LG,
      padding: SPACING.LG,
      marginBottom: SPACING.MD,
    },
    cardLabel: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      fontWeight: '600',
      color: colors.TEXT.PRIMARY,
      marginBottom: 2,
    },
    cardDesc: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.TERTIARY,
    },
    badgeOn: {
      backgroundColor: colors.SUCCESS + '20',
    },
    badgeOff: {
      backgroundColor: colors.ERROR + '20',
    },
    badgeTextOn: {
      color: colors.SUCCESS,
    },
    badgeTextOff: {
      color: colors.ERROR,
    },
    tip: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
      textAlign: 'center',
      marginTop: SPACING.XL,
    },
  }), [colors]);

  const checkAll = useCallback(async () => {
    if (Platform.OS !== 'android') {
      // iOS 权限无法通过 JS 同步检查，默认显示已获取（用户可在系统设置中管理）
      const allGranted: Record<string, boolean> = {};
      PERMS.forEach(p => { allGranted[p.key] = true; });
      setGranted(allGranted);
      return;
    }
    const results: Record<string, boolean> = {};
    for (const p of PERMS) {
      const check = await PermissionsAndroid.check(p.androidPerm as any);
      results[p.key] = check;
    }
    setGranted(results);
  }, []);

  useEffect(() => {
    checkAll();
  }, [checkAll]);

  const handleRequest = async (perm: PermItem) => {
    if (Platform.OS !== 'android') {
      // iOS 跳转系统设置
      Linking.openSettings();
      return;
    }
    const result = await PermissionsAndroid.request(perm.androidPerm as any);
    setGranted(prev => ({ ...prev, [perm.key]: result === PermissionsAndroid.RESULTS.GRANTED }));
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Dialog.show('权限被拒绝', `"${perm.label}"已被设为拒绝且不再询问，请在系统设置中手动开启`, [
        { text: '取消', style: 'cancel' },
        { text: '去设置', onPress: () => Linking.openSettings() },
      ]);
    }
  };

  return (
    <FeatureScreenLayout>
      <FeatureHeader title="系统权限" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {PERMS.map(perm => {
          const isGranted = granted?.[perm.key];
          return (
            <TouchableOpacity
              key={perm.key}
              style={dynamicStyles.card}
              onPress={() => handleRequest(perm)}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeft}>
                {isGranted ? (
                  <IconShieldCheck size={28} color={colors.SUCCESS} />
                ) : (
                  <IconShieldCross size={28} color={colors.ERROR} />
                )}
                <View style={styles.cardText}>
                  <Text style={dynamicStyles.cardLabel}>{perm.label}</Text>
                  <Text style={dynamicStyles.cardDesc}>{perm.desc}</Text>
                </View>
              </View>
              <View style={[styles.badge, isGranted ? dynamicStyles.badgeOn : dynamicStyles.badgeOff]}>
                <Text style={[styles.badgeText, isGranted ? dynamicStyles.badgeTextOn : dynamicStyles.badgeTextOff]}>
                  {isGranted ? '已获取' : granted === null ? '检测中' : '未获取'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <Text style={dynamicStyles.tip}>点击权限项可重新请求授权</Text>
      </ScrollView>
    </FeatureScreenLayout>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.XL, paddingBottom: SPACING.XXXL * 2, paddingTop: SPACING.MD },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    flex: 1,
  },
  cardText: {
    flex: 1,
  },
  badge: {
    borderRadius: BORDER_RADIUS.SM,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '500',
  },
});
