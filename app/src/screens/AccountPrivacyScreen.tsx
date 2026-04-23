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
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { storageService } from '../services/storageService';
import { chatService } from '../services/chatService';
import * as chatDB from '../services/chatDatabaseService';
import { Dialog } from '../components/Dialog';
import { Toast } from '../components/Toast';
import { SectionItem } from '../components/SectionItem';

type NavProp = { goBack: () => void };

const PASSWORD_STRENGTH_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,72}$/;

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
    hint: {
      fontSize: TYPOGRAPHY.FONT_SIZE.XS,
      color: colors.TEXT.QUATERNARY,
      marginTop: -SPACING.XS,
    },
    hintError: {
      color: colors.ERROR,
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

  const passwordValid = PASSWORD_STRENGTH_REGEX.test(newPwd);

  const handleSubmit = async () => {
    if (!newPwd || !confirmPwd) { Toast.show('请填写所有字段'); return; }
    if (!passwordValid) { Toast.show('密码需包含字母和数字，6-72位'); return; }
    if (newPwd !== confirmPwd) { Toast.show('两次输入的密码不一致'); return; }
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
        <TextInput style={mStyles.input} value={newPwd} onChangeText={setNewPwd} placeholder="请输入密码" placeholderTextColor={colors.TEXT.PLACEHOLDER} secureTextEntry maxLength={72} />
        <Text style={[mStyles.hint, newPwd && !passwordValid && mStyles.hintError]}>
          {newPwd ? (passwordValid ? '密码强度符合要求' : '需包含字母和数字，6-72位') : '需包含字母和数字，6-72位'}
        </Text>
        <TextInput style={mStyles.input} value={confirmPwd} onChangeText={setConfirmPwd} placeholder="请再次输入密码" placeholderTextColor={colors.TEXT.PLACEHOLDER} secureTextEntry maxLength={72} />
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
    hint: {
      fontSize: TYPOGRAPHY.FONT_SIZE.XS,
      color: colors.TEXT.QUATERNARY,
      marginTop: -SPACING.XS,
    },
    hintError: {
      color: colors.ERROR,
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

  const newPasswordValid = PASSWORD_STRENGTH_REGEX.test(newPwd);

  const handleSubmit = async () => {
    if (!curPwd || !newPwd || !confirmPwd) { Toast.show('请填写所有字段'); return; }
    if (!newPasswordValid) { Toast.show('新密码需包含字母和数字，6-72位'); return; }
    if (newPwd !== confirmPwd) { Toast.show('两次输入的新密码不一致'); return; }
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
        <TextInput style={mStyles.input} value={curPwd} onChangeText={setCurPwd} placeholder="请输入当前密码" placeholderTextColor={colors.TEXT.PLACEHOLDER} secureTextEntry maxLength={72} />
        <TextInput style={mStyles.input} value={newPwd} onChangeText={setNewPwd} placeholder="请输入新密码" placeholderTextColor={colors.TEXT.PLACEHOLDER} secureTextEntry maxLength={72} />
        <Text style={[mStyles.hint, newPwd && !newPasswordValid && mStyles.hintError]}>
          {newPwd ? (newPasswordValid ? '密码强度符合要求' : '需包含字母和数字，6-72位') : '需包含字母和数字，6-72位'}
        </Text>
        <TextInput style={mStyles.input} value={confirmPwd} onChangeText={setConfirmPwd} placeholder="请再次输入新密码" placeholderTextColor={colors.TEXT.PLACEHOLDER} secureTextEntry maxLength={72} />
        <View style={mStyles.btnRow}>
          <TouchableOpacity style={[mStyles.btn, mStyles.btnCancel]} onPress={onClose}><Text style={mStyles.btnCancelText}>取消</Text></TouchableOpacity>
          <TouchableOpacity style={[mStyles.btn, mStyles.btnConfirm, loading && mStyles.btnDisabled]} onPress={handleSubmit} disabled={loading}><Text style={mStyles.btnConfirmText}>{loading ? '处理中...' : '确认修改'}</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- 绑定邮箱弹窗 ---
const BindEmailModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ visible, onClose, onSuccess }) => {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
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

  const handleBind = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Toast.show('请输入正确的邮箱地址');
      return;
    }
    setLoading(true);
    try {
      await accountService.bindEmail(email);
      Toast.show('验证邮件已发送，请查收');
      onSuccess();
      onClose();
    } catch (e: any) {
      Toast.show(e?.response?.data?.error || '绑定失败');
    } finally {
      setLoading(false);
      setEmail('');
    }
  };

  return (
    <View style={mStyles.overlay}>
      <View style={mStyles.card}>
        <Text style={mStyles.title}>绑定邮箱</Text>
        <TextInput
          style={mStyles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="请输入邮箱地址"
          placeholderTextColor={colors.TEXT.PLACEHOLDER}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View style={mStyles.btnRow}>
          <TouchableOpacity style={[mStyles.btn, mStyles.btnCancel]} onPress={onClose}><Text style={mStyles.btnCancelText}>取消</Text></TouchableOpacity>
          <TouchableOpacity style={[mStyles.btn, mStyles.btnConfirm, loading && mStyles.btnDisabled]} onPress={handleBind} disabled={loading}><Text style={mStyles.btnConfirmText}>{loading ? '发送中...' : '发送验证邮件'}</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- 换绑手机号弹窗 ---
const ChangePhoneModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ visible, onClose, onSuccess }) => {
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const mStyles = useMemo(() => StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.XXL },
    card: { backgroundColor: colors.BACKGROUND, borderWidth: 1, borderColor: colors.BORDER.LIGHT, borderRadius: BORDER_RADIUS.XL, padding: SPACING.XXL, width: '100%', maxWidth: 380, gap: SPACING.MD },
    title: { fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '600', color: colors.TEXT.PRIMARY, textAlign: 'center', marginBottom: SPACING.SM },
    input: { backgroundColor: colors.OVERLAY.MEDIUM, borderWidth: 1, borderColor: colors.BORDER.MEDIUM, borderRadius: BORDER_RADIUS.MD, paddingHorizontal: SPACING.LG, paddingVertical: SPACING.MD, fontSize: TYPOGRAPHY.FONT_SIZE.MD, color: colors.TEXT.PRIMARY },
    codeRow: { flexDirection: 'row', gap: SPACING.MD, alignItems: 'center' },
    codeInput: { flex: 1, backgroundColor: colors.OVERLAY.MEDIUM, borderWidth: 1, borderColor: colors.BORDER.MEDIUM, borderRadius: BORDER_RADIUS.MD, paddingHorizontal: SPACING.LG, paddingVertical: SPACING.MD, fontSize: TYPOGRAPHY.FONT_SIZE.MD, color: colors.TEXT.PRIMARY },
    codeBtn: { paddingHorizontal: SPACING.MD, paddingVertical: SPACING.MD, borderRadius: BORDER_RADIUS.MD, backgroundColor: colors.OVERLAY.MEDIUM },
    codeBtnDisabled: { opacity: 0.5 },
    codeBtnText: { fontSize: TYPOGRAPHY.FONT_SIZE.SM, color: colors.PRIMARY, fontWeight: '500' },
    btnRow: { flexDirection: 'row', gap: SPACING.MD, marginTop: SPACING.SM },
    btn: { flex: 1, paddingVertical: SPACING.MD, borderRadius: BORDER_RADIUS.MD, alignItems: 'center' },
    btnCancel: { backgroundColor: colors.OVERLAY.MEDIUM },
    btnCancelText: { fontSize: TYPOGRAPHY.FONT_SIZE.MD, color: colors.TEXT.TERTIARY },
    btnConfirm: { backgroundColor: colors.PRIMARY },
    btnConfirmText: { fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '600', color: '#ffffff' },
    btnDisabled: { opacity: 0.5 },
  }), [colors]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!visible) return null;

  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) { Toast.show('请输入正确的手机号'); return; }
    setSending(true);
    try {
      await authService.sendVerificationCode(phone);
      setCountdown(60);
      Toast.show('验证码已发送');
    } catch { Toast.show('发送失败'); }
    finally { setSending(false); }
  };

  const handleSubmit = async () => {
    if (!phone || phone.length !== 11) { Toast.show('请输入正确的手机号'); return; }
    if (!code || code.length !== 6) { Toast.show('请输入6位验证码'); return; }
    setLoading(true);
    try {
      await accountService.changePhone(phone, code);
      Toast.show('手机号换绑成功');
      onSuccess();
      onClose();
    } catch (e: any) { Toast.show(e?.response?.data?.error || '换绑失败'); }
    finally { setLoading(false); setPhone(''); setCode(''); }
  };

  return (
    <View style={mStyles.overlay}>
      <View style={mStyles.card}>
        <Text style={mStyles.title}>换绑手机号</Text>
        <TextInput style={mStyles.input} value={phone} onChangeText={setPhone} placeholder="请输入新手机号" placeholderTextColor={colors.TEXT.PLACEHOLDER} keyboardType="phone-pad" maxLength={11} />
        <View style={mStyles.codeRow}>
          <TextInput style={mStyles.codeInput} value={code} onChangeText={setCode} placeholder="验证码" placeholderTextColor={colors.TEXT.PLACEHOLDER} keyboardType="number-pad" maxLength={6} />
          <TouchableOpacity style={[mStyles.codeBtn, (countdown > 0 || sending) && mStyles.codeBtnDisabled]} onPress={handleSendCode} disabled={countdown > 0 || sending}>
            <Text style={mStyles.codeBtnText}>{countdown > 0 ? `${countdown}s` : sending ? '发送中' : '获取验证码'}</Text>
          </TouchableOpacity>
        </View>
        <View style={mStyles.btnRow}>
          <TouchableOpacity style={[mStyles.btn, mStyles.btnCancel]} onPress={onClose}><Text style={mStyles.btnCancelText}>取消</Text></TouchableOpacity>
          <TouchableOpacity style={[mStyles.btn, mStyles.btnConfirm, loading && mStyles.btnDisabled]} onPress={handleSubmit} disabled={loading}><Text style={mStyles.btnConfirmText}>{loading ? '处理中...' : '确认换绑'}</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- 隐私级别选择弹窗 ---
const VisibilityPickerModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  current: string;
  onSelect: (v: string) => void;
}> = ({ visible, onClose, current, onSelect }) => {
  const { colors } = useTheme();

  const mStyles = useMemo(() => StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.XXL },
    card: { backgroundColor: colors.BACKGROUND, borderWidth: 1, borderColor: colors.BORDER.LIGHT, borderRadius: BORDER_RADIUS.XL, padding: SPACING.XXL, width: '100%', maxWidth: 320, gap: SPACING.SM },
    title: { fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '600', color: colors.TEXT.PRIMARY, textAlign: 'center', marginBottom: SPACING.SM },
    option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.MD, paddingHorizontal: SPACING.MD, borderRadius: BORDER_RADIUS.MD },
    optionSelected: { backgroundColor: colors.OVERLAY.MEDIUM },
    optionText: { fontSize: TYPOGRAPHY.FONT_SIZE.MD, color: colors.TEXT.SECONDARY },
    optionDesc: { fontSize: TYPOGRAPHY.FONT_SIZE.XS, color: colors.TEXT.QUATERNARY },
    optionTextSelected: { color: colors.PRIMARY, fontWeight: '500' },
  }), [colors]);

  if (!visible) return null;

  const options = [
    { value: 'PUBLIC', label: '所有人', desc: '任何人都可以查看你的主页' },
    { value: 'FRIENDS', label: '仅好友', desc: '只有好友可以查看你的主页' },
    { value: 'PRIVATE', label: '仅自己', desc: '只有你自己可以查看' },
  ];

  return (
    <View style={mStyles.overlay}>
      <View style={mStyles.card}>
        <Text style={mStyles.title}>隐私设置</Text>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[mStyles.option, current === opt.value && mStyles.optionSelected]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={[mStyles.optionText, current === opt.value && mStyles.optionTextSelected]}>{opt.label}</Text>
              <Text style={mStyles.optionDesc}>{opt.desc}</Text>
            </View>
            {current === opt.value && <Text style={{ color: colors.PRIMARY, fontSize: 18 }}>✓</Text>}
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={{ paddingVertical: SPACING.MD, alignItems: 'center' }} onPress={onClose}>
          <Text style={{ color: colors.TEXT.TERTIARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD }}>取消</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- 主页面 ---
export const AccountPrivacyScreen: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [showSetPwd, setShowSetPwd] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showBindEmail, setShowBindEmail] = useState(false);
  const [showChangePhone, setShowChangePhone] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);
  const [visibility, setVisibility] = useState<string>('PUBLIC');

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
      setEmail(profile.email || null);
      setEmailVerified(profile.emailVerified || false);
      const vis = await accountService.getVisibility();
      setVisibility(vis.visibility);
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

  const handleDeleteAllChat = () => {
    Dialog.show(
      '删除全部聊天记录',
      '此操作将同时删除服务器和本地的所有对话及聊天消息，且不可恢复。确定继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.deleteAllChatData();
              chatDB.clearAllChatData();
              Toast.show('所有聊天记录已删除');
            } catch {
              Toast.show('删除失败');
            }
          },
        },
      ],
    );
  };

  const notImplemented = () => Toast.show('功能开发中');

  const maskedPhone = phone.length >= 7 ? phone.slice(0, 3) + '****' + phone.slice(-4) : '未绑定';
  const emailDisplay = email
    ? (emailVerified ? email : email + '（未验证）')
    : '未绑定';

  const visibilityLabel = visibility === 'PUBLIC' ? '所有人'
    : visibility === 'FRIENDS' ? '仅好友' : '仅自己';

  const handleVisibilityChange = async (v: string) => {
    try {
      await accountService.updateVisibility(v);
      setVisibility(v);
      setShowVisibilityPicker(false);
      Toast.show('隐私设置已更新');
    } catch {
      Toast.show('设置失败');
    }
  };

  return (
    <FeatureScreenLayout>
      <FeatureHeader title="账号安全" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* 登录信息 */}
        <Text style={dynamicStyles.sectionTitle}>登录信息</Text>
        <View style={dynamicStyles.card}>
          <SectionItem title="手机号" value={maskedPhone} onPress={() => setShowChangePhone(true)} />
          <View style={dynamicStyles.divider} />
          <SectionItem title="登录密码" value={hasPassword ? '已设置' : '未设置'} onPress={handlePasswordPress} />
          <View style={dynamicStyles.divider} />
          <SectionItem title="绑定邮箱" value={emailDisplay} onPress={() => setShowBindEmail(true)} />
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

        {/* 隐私设置 */}
        <Text style={dynamicStyles.sectionTitle}>隐私设置</Text>
        <View style={dynamicStyles.card}>
          <SectionItem title="谁可以看我的主页" value={visibilityLabel} onPress={() => setShowVisibilityPicker(true)} />
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
          <SectionItem title="删除全部聊天记录" danger onPress={handleDeleteAllChat} />
          <View style={dynamicStyles.divider} />
          <SectionItem title="注销账号" danger onPress={handleDeleteAccount} />
        </View>
      </ScrollView>

      <SetPasswordModal visible={showSetPwd} onClose={() => setShowSetPwd(false)} onSuccess={loadProfile} />
      <ChangePasswordModal visible={showChangePwd} onClose={() => setShowChangePwd(false)} onSuccess={loadProfile} />
      <BindEmailModal visible={showBindEmail} onClose={() => setShowBindEmail(false)} onSuccess={loadProfile} />
      <ChangePhoneModal visible={showChangePhone} onClose={() => setShowChangePhone(false)} onSuccess={loadProfile} />
      <VisibilityPickerModal visible={showVisibilityPicker} onClose={() => setShowVisibilityPicker(false)} current={visibility} onSelect={handleVisibilityChange} />
    </FeatureScreenLayout>
  );
};


const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.XL, paddingBottom: SPACING.XXXL * 2 },
});
