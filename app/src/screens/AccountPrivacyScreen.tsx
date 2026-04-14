/**
 * 账号隐私页面
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { FeatureHeader } from '../components/FeatureScreenOverlay';
import { accountService } from '../services/accountService';
import { Dialog } from '../components/Dialog';
import { Toast } from '../components/Toast';
import { storageService } from '../services/storageService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DrawerStackParamList } from '../navigation/DrawerStack';

type NavProp = NativeStackNavigationProp<DrawerStackParamList, 'AccountPrivacy'>;

type Visibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

const visibilityOptions: { value: Visibility; label: string; desc: string }[] = [
  { value: 'PUBLIC', label: '公开', desc: '所有人可见' },
  { value: 'FRIENDS', label: '好友可见', desc: '仅好友可见' },
  { value: 'PRIVATE', label: '私密', desc: '仅自己可见' },
];

export const AccountPrivacyScreen: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const [newPhone, setNewPhone] = useState('');
  const [code, setCode] = useState('');
  const [changingPhone, setChangingPhone] = useState(false);
  const [selectedVisibility, setSelectedVisibility] = useState<Visibility>('FRIENDS');
  const [savingVisibility, setSavingVisibility] = useState(false);

  const handleChangePhone = async () => {
    if (!newPhone || !code) {
      Toast.show('请输入手机号和验证码');
      return;
    }
    setChangingPhone(true);
    try {
      await accountService.changePhone(newPhone, code);
      // Update local storage
      const user = await storageService.getUser();
      if (user) {
        await storageService.saveUser({ ...user, phone: newPhone });
      }
      Toast.show('手机号已更换');
      setNewPhone('');
      setCode('');
    } catch {
      Toast.show('更换手机号失败');
    } finally {
      setChangingPhone(false);
    }
  };

  const handleVisibilityChange = async (v: Visibility) => {
    setSavingVisibility(true);
    try {
      await accountService.updateVisibility(v);
      setSelectedVisibility(v);
      Toast.show('隐私设置已更新');
    } catch {
      Toast.show('更新失败');
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleDeleteAccount = () => {
    Dialog.show(
      '注销账户',
      '此操作将永久删除你的账户和所有数据，且不可恢复。确定继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '注销账户',
          style: 'destructive',
          onPress: async () => {
            try {
              await accountService.deleteAccount();
              await storageService.clearAuthData();
              Toast.show('账户已注销');
            } catch {
              Toast.show('注销失败');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <FeatureHeader title="账号隐私" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Change phone */}
        <Text style={styles.sectionTitle}>换绑手机号</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            value={newPhone}
            onChangeText={setNewPhone}
            placeholder="新手机号"
            placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
            keyboardType="phone-pad"
            maxLength={11}
          />
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="验证码"
            placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity
            style={[styles.btn, changingPhone && styles.btnDisabled]}
            onPress={handleChangePhone}
            disabled={changingPhone}
            activeOpacity={0.7}
          >
            <Text style={styles.btnText}>{changingPhone ? '更换中...' : '更换手机号'}</Text>
          </TouchableOpacity>
        </View>

        {/* Data visibility */}
        <Text style={styles.sectionTitle}>数据可见性</Text>
        <View style={styles.card}>
          {visibilityOptions.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.visibilityOption,
                selectedVisibility === opt.value && styles.visibilityOptionActive,
              ]}
              onPress={() => handleVisibilityChange(opt.value)}
              disabled={savingVisibility}
              activeOpacity={0.7}
            >
              <View style={styles.radioOuter}>
                {selectedVisibility === opt.value && <View style={styles.radioInner} />}
              </View>
              <View style={styles.visibilityText}>
                <Text style={styles.visibilityLabel}>{opt.label}</Text>
                <Text style={styles.visibilityDesc}>{opt.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Delete account */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>危险操作</Text>
          <TouchableOpacity
            style={[styles.btn, styles.dangerBtn]}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Text style={styles.dangerBtnText}>注销账户</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.XL, paddingBottom: SPACING.XXXL * 2 },
  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '500',
    color: COLORS.TEXT.QUATERNARY,
    marginBottom: SPACING.MD,
    marginTop: SPACING.XXL,
  },
  card: {
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    gap: SPACING.MD,
  },
  input: {
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    color: COLORS.TEXT.PRIMARY,
  },
  btn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.MD,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    paddingVertical: SPACING.MD,
  },
  visibilityOptionActive: {},
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.BORDER.HEAVY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.PRIMARY,
  },
  visibilityText: { flex: 1 },
  visibilityLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '500',
    color: COLORS.TEXT.SECONDARY,
  },
  visibilityDesc: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
    marginTop: 2,
  },
  dangerZone: {
    marginTop: SPACING.XXXL,
    paddingTop: SPACING.XL,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.LIGHT,
  },
  dangerTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.ERROR,
    fontWeight: '500',
    marginBottom: SPACING.MD,
  },
  dangerBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerBtnText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '500',
    color: COLORS.ERROR,
  },
});
