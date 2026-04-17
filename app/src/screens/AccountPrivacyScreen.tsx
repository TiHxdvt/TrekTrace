/**
 * 账号安全页面
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { FeatureHeader } from '../components/FeatureScreenOverlay';
import { FeatureScreenLayout } from '../components/FeatureScreenLayout';
import { accountService } from '../services/accountService';
import { userService } from '../services/userService';
import { storageService } from '../services/storageService';
import { Dialog } from '../components/Dialog';
import { Toast } from '../components/Toast';
import { IconAltArrowRight } from '../components/SolarIcons';

type NavProp = { goBack: () => void };

// --- 设置密码弹窗 ---
const SetPasswordModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ visible, onClose, onSuccess }) => {
  const { colors } = useTheme();
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const mStyles = useMemo(() => StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.XXL,
    },
    card: {
      backgroundColor: colors.BACKGROUND,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      borderRadius: BORDER_RADIUS.XL,
      padding: SPACING.XXL,
      width: '100%',
      maxWidth: 380,
      gap: SPACING.MD,
    },
    title: {
      fontSize: TYPOGRAPHY.FONT_SIZE.LG,
      fontWeight: '600',
      color: colors.TEXT.PRIMARY,
      textAlign: 'center',
      marginBottom: SPACING.SM,
    },
    input: {
      backgroundColor: colors.OVERLAY.MEDIUM,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
      borderRadius: BORDER_RADIUS.MD,
      paddingHorizontal: SPACING.LG,
      paddingVertical: SPACING.MD,
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.PRIMARY,
    },
    btnRow: {
      flexDirection: 'row',
      gap: SPACING.MD,
      marginTop: SPACING.SM,
    },
    btn: {
      flex: 1,
      paddingVertical: SPACING.MD,
      borderRadius: BORDER_RADIUS.MD,
      alignItems: 'center',
    },
    btnCancel: {
      backgroundColor: colors.OVERLAY.MEDIUM,
    },
    btnCancelText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.TERTIARY,
    },
    btnConfirm: {
      backgroundColor: colors.PRIMARY,
    },
    btnConfirmText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      fontWeight: '600',
      color: '#ffffff',
    },
    btnDisabled: { opacity: 0.5 },
  }), [colors]);

  if (!visible) return null;

  const handleSubmit = async () => {
    if (!newPwd || !confirmPwd) { Toast.show('请填写所有字段'); return; }
    if (newPwd !== confirmPwd) { Toast.show('两次输入的密码不一致'); return; }
    if (newPwd.length < 6) { Toast.show('密码长度至少6位'); return; }
    setLoading(true);
    try {
      await accountService.setPassword(newPwd);
      Toast.show('密码设置成功');
      onSuccess();
      onClose();
    } catch (e: any) {
      Toast.show(e?.response?.data?.error || '设置失败');
    } finally {
      setLoading(false);
      setNewPwd('');
      setConfirmPwd('');
    }
  };

  return (
    <View style={mStyles.overlay}>
      <View style={mStyles.card}>
        <Text style={mStyles.title}>设置密码</Text>
        <TextInput style={mStyles.input} value={newPwd} onChangeText={setNewPwd} placeholder="请输入密码（至少6位）" placeholderTextColor={colors.TEXT.PLACEHOLDER} secureTextEntry maxLength={20} />
        <TextInput style={mStyles.input} value={confirmPwd} onChangeText={setConfirmPwd} placeholder="请再次输入密码" placeholderTextColor={colors.TEXT.PLACEHOLDER} secureTextEntry maxLength={20} />
        <View style={mStyles.btnRow}>
          <TouchableOpacity style={[mStyles.btn, mStyles.btnCancel]} onPress={onClose}><Text style={mStyles.btnCancelText}>取消</Text></TouchableOpacity>
          <TouchableOpacity style={[mStyles.btn, mStyles.btnConfirm, loading && mStyles.btnDisabled]} onPress={handleSubmit} disabled={loading}><Text style={mStyles.btnConfirmText}>{loading ? '处理中...' : '确认'}</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- 修改密码弹窗 ---
const ChangePasswordModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ visible, onClose, onSuccess }) => {
  const { colors } = useTheme();
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const mStyles = useMemo(() => StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.XXL,
    },
    card: {
      backgroundColor: colors.BACKGROUND,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      borderRadius: BORDER_RADIUS.XL,
      padding: SPACING.XXL,
      width: '100%',
      maxWidth: 380,
      gap: SPACING.MD,
    },
    title: {
      fontSize: TYPOGRAPHY.FONT_SIZE.LG,
      fontWeight: '600',
      color: colors.TEXT.PRIMARY,
      textAlign: 'center',
      marginBottom: SPACING.SM,
    },
    input: {
      backgroundColor: colors.OVERLAY.MEDIUM,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
      borderRadius: BORDER_RADIUS.MD,
      paddingHorizontal: SPACING.LG,
      paddingVertical: SPACING.MD,
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.PRIMARY,
    },
    btnRow: {
      flexDirection: 'row',
      gap: SPACING.MD,
      marginTop: SPACING.SM,
    },
    btn: {
      flex: 1,
      paddingVertical: SPACING.MD,
      borderRadius: BORDER_RADIUS.MD,
      alignItems: 'center',
    },
    btnCancel: {
      backgroundColor: colors.OVERLAY.MEDIUM,
    },
    btnCancelText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.TERTIARY,
    },
    btnConfirm: {
      backgroundColor: colors.PRIMARY,
    },
    btnConfirmText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      fontWeight: '600',
      color: '#ffffff',
    },
    btnDisabled: { opacity: 0.5 },
  }), [colors]);

  if (!visible) return null;

  const handleSubmit = async () => {
    if (!curPwd || !newPwd || !confirmPwd) { Toast.show('请填写所有字段'); return; }
    if (newPwd !== confirmPwd) { Toast.show('两次输入的新密码不一致'); return; }
    if (newPwd.length < 6) { Toast.show('密码长度至少6位'); return; }
    setLoading(true);
    try {
      await accountService.changePassword(curPwd, newPwd);
      Toast.show('密码修改成功');
      onSuccess();
      onClose();
    } catch (e: any) {
      Toast.show(e?.response?.data?.error || '修改失败');
    } finally {
      setLoading(false);
      setCurPwd('');
      setNewPwd('');
      setConfirmPwd('');
    }
  };

  return (
    <View style={mStyles.overlay}>
      <View style={mStyles.card}>
        <Text style={mStyles.title}>修改密码</Text>
        <TextInput style={mStyles.input} value={curPwd} onChangeText={setCurPwd} placeholder="请输入当前密码" placeholderTextColor={colors.TEXT.PLACEHOLDER} secureTextEntry maxLength={20} />
        <TextInput style={mStyles.input} value={newPwd} onChangeText={setNewPwd} placeholder="请输入新密码（至少6位）" placeholderTextColor={colors.TEXT.PLACEHOLDER} secureTextEntry maxLength={20} />
        <TextInput style={mStyles.input} value={confirmPwd} onChangeText={setConfirmPwd} placeholder="请再次输入新密码" placeholderTextColor={colors.TEXT.PLACEHOLDER} secureTextEntry maxLength={20} />
        <View style={mStyles.btnRow}>
          <TouchableOpacity style={[mStyles.btn, mStyles.btnCancel]} onPress={onClose}><Text style={mStyles.btnCancelText}>取消</Text></TouchableOpacity>
          <TouchableOpacity style={[mStyles.btn, mStyles.btnConfirm, loading && mStyles.btnDisabled]} onPress={handleSubmit} disabled={loading}><Text style={mStyles.btnConfirmText}>{loading ? '处理中...' : '确认修改'}</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- 主页面 ---
export const AccountPrivacyScreen: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [showSetPwd, setShowSetPwd] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    sectionTitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
      fontWeight: '500',
      color: colors.TEXT.QUATERNARY,
      marginBottom: SPACING.MD,
      marginTop: SPACING.XXL,
    },
    card: {
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      borderRadius: BORDER_RADIUS.LG,
      paddingHorizontal: SPACING.LG,
    },
    itemTitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.SECONDARY,
    },
    itemValue: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
    },
    dangerText: {
      color: colors.ERROR,
    },
    divider: {
      height: 1,
      backgroundColor: colors.BORDER.LIGHT,
    },
    dangerSectionTitle: {
      color: colors.ERROR,
    },
  }), [colors]);

  const loadProfile = async () => {
    try {
      const profile = await userService.getProfile();
      setPhone(profile.phone || '');
      setHasPassword(profile.hasPassword);
    } catch {}
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handlePasswordPress = () => {
    if (hasPassword) {
      setShowChangePwd(true);
    } else {
      setShowSetPwd(true);
    }
  };

  const handleDeleteAccount = () => {
    Dialog.show(
      '注销账户',
      '此操作将永久删除你的账户和所有数据，且不可恢复。确定继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定注销',
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

  const notImplemented = () => Toast.show('功能开发中');

  const maskedPhone = phone.length >= 7 ? phone.slice(0, 3) + '****' + phone.slice(-4) : '未绑定';

  return (
    <FeatureScreenLayout>
      <FeatureHeader title="账号安全" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* 登录信息 */}
        <Text style={dynamicStyles.sectionTitle}>登录信息</Text>
        <View style={dynamicStyles.card}>
          <SectionItem title="手机号" value={maskedPhone} onPress={notImplemented} />
          <View style={dynamicStyles.divider} />
          <SectionItem title="登录密码" value={hasPassword ? '已设置' : '未设置'} onPress={handlePasswordPress} />
        </View>

        {/* 第三方账号 */}
        <Text style={dynamicStyles.sectionTitle}>第三方账号</Text>
        <View style={dynamicStyles.card}>
          <SectionItem title="微信账号" value="未绑定" onPress={notImplemented} />
          <View style={dynamicStyles.divider} />
          <SectionItem title="微博账号" value="未绑定" onPress={notImplemented} />
          <View style={dynamicStyles.divider} />
          <SectionItem title="QQ账号" value="未绑定" onPress={notImplemented} />
        </View>

        {/* 安全设置 */}
        <Text style={dynamicStyles.sectionTitle}>安全设置</Text>
        <View style={dynamicStyles.card}>
          <SectionItem title="登录设备管理" onPress={notImplemented} />
          <View style={dynamicStyles.divider} />
          <SectionItem title="账号找回" onPress={notImplemented} />
        </View>

        {/* 危险操作 */}
        <Text style={[dynamicStyles.sectionTitle, dynamicStyles.dangerSectionTitle]}>危险操作</Text>
        <View style={dynamicStyles.card}>
          <SectionItem title="注销账号" danger onPress={handleDeleteAccount} />
        </View>
      </ScrollView>

      <SetPasswordModal visible={showSetPwd} onClose={() => setShowSetPwd(false)} onSuccess={loadProfile} />
      <ChangePasswordModal visible={showChangePwd} onClose={() => setShowChangePwd(false)} onSuccess={loadProfile} />
    </FeatureScreenLayout>
  );
};

// --- 通用菜单项 ---
const SectionItem: React.FC<{
  title: string;
  value?: string;
  danger?: boolean;
  onPress: () => void;
}> = ({ title, value, danger, onPress }) => {
  const { colors } = useTheme();

  const itemStyles = useMemo(() => StyleSheet.create({
    itemTitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.SECONDARY,
    },
    itemValue: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
    },
    dangerText: {
      color: colors.ERROR,
    },
  }), [colors]);

  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <Text style={[itemStyles.itemTitle, danger && itemStyles.dangerText]}>{title}</Text>
      <View style={styles.itemRight}>
        {value ? <Text style={[itemStyles.itemValue, danger && itemStyles.dangerText]}>{value}</Text> : null}
        <IconAltArrowRight size={18} color={danger ? colors.ERROR : colors.TEXT.QUINARY} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.XL, paddingBottom: SPACING.XXXL * 2 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.LG,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },
});
