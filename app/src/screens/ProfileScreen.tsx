/**
 * 个人信息页面
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { FeatureHeader } from '../components/FeatureScreenOverlay';
import { FeatureScreenLayout } from '../components/FeatureScreenLayout';
import { userService, ProfileData } from '../services/userService';
import { storageService } from '../services/storageService';
import { Toast } from '../components/Toast';
import { SectionItem } from '../components/SectionItem';
import { SubScreenOverlay } from '../components/SubScreenOverlay';

type NavProp = { goBack: () => void };

const NICKNAME_MAX_LENGTH = 14;
const NICKNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BIO_MAX_LENGTH = 200;

/** 截断字符串使其显示宽度不超过 max */
function truncateToWidth(s: string, max: number): string {
  let w = 0;
  for (let i = 0; i < s.length; i++) {
    w += s.charCodeAt(i) > 0x7F ? 2 : 1;
    if (w > max) return s.slice(0, i);
  }
  return s;
}

/** 计算昵称修改冷却剩余描述，null 表示可以修改 */
function getCooldownDesc(updatedAt: string | null | undefined): string | null {
  if (!updatedAt) return null;
  const updatedMs = new Date(updatedAt).getTime();
  const remaining = updatedMs + NICKNAME_COOLDOWN_MS - Date.now();
  if (remaining <= 0) return null;
  const totalMinutes = Math.floor(remaining / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    const dayPart = `${days}天`;
    const hourPart = hours > 0 ? `${hours}小时` : '';
    return `昵称修改冷却中，还需${dayPart}${hourPart}`;
  }
  if (hours > 0) return `昵称修改冷却中，还需${hours}小时${minutes}分钟`;
  return `昵称修改冷却中，还需${minutes}分钟`;
}

// --- Modal 样式工厂 ---
function modalStyles(colors: any) {
  return StyleSheet.create({
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
    option: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.MD,
      paddingHorizontal: SPACING.MD,
      borderRadius: BORDER_RADIUS.MD,
    },
    optionSelected: {
      backgroundColor: colors.OVERLAY.MEDIUM,
    },
    optionText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.SECONDARY,
    },
    optionTextSelected: {
      color: colors.PRIMARY,
      fontWeight: '500',
    },
    charCount: {
      fontSize: TYPOGRAPHY.FONT_SIZE.XS,
      color: colors.TEXT.QUATERNARY,
      textAlign: 'right',
    },
  });
}

// --- 昵称编辑弹框 ---
const EditNicknameModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  initialValue: string;
  cooldownDesc: string | null;
  onSuccess: () => void;
}> = ({ visible, onClose, initialValue, cooldownDesc, onSuccess }) => {
  const { colors } = useTheme();
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const ms = useMemo(() => modalStyles(colors), [colors]);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  if (!visible) return null;

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) { Toast.show('昵称不能为空'); return; }
    setLoading(true);
    try {
      const updated = await userService.updateProfile({ nickname: trimmed });
      const user = await storageService.getUser();
      if (user) {
        await storageService.saveUser({ ...user, nickname: updated.nickname });
      }
      Toast.show('昵称已更新');
      onSuccess();
      onClose();
    } catch (e: any) {
      Toast.show(e?.response?.data?.error || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={ms.overlay}>
      <View style={ms.card}>
        <Text style={ms.title}>修改昵称</Text>
        {cooldownDesc && <Text style={[ms.hint, { color: colors.WARNING }]}>{cooldownDesc}</Text>}
        <TextInput
          style={ms.input}
          value={value}
          onChangeText={(text) => setValue(truncateToWidth(text, NICKNAME_MAX_LENGTH))}
          placeholder="输入昵称"
          placeholderTextColor={colors.TEXT.PLACEHOLDER}
          editable={!cooldownDesc}
        />
        <View style={ms.btnRow}>
          <TouchableOpacity style={[ms.btn, ms.btnCancel]} onPress={onClose}><Text style={ms.btnCancelText}>取消</Text></TouchableOpacity>
          <TouchableOpacity style={[ms.btn, ms.btnConfirm, (loading || !!cooldownDesc) && ms.btnDisabled]} onPress={handleSubmit} disabled={loading || !!cooldownDesc}><Text style={ms.btnConfirmText}>{loading ? '保存中...' : '确认'}</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- 签名编辑弹框 ---
const EditBioModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  initialValue: string;
  onSuccess: () => void;
}> = ({ visible, onClose, initialValue, onSuccess }) => {
  const { colors } = useTheme();
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const ms = useMemo(() => modalStyles(colors), [colors]);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  if (!visible) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await userService.updateProfile({ bio: value || undefined });
      Toast.show('签名已更新');
      onSuccess();
      onClose();
    } catch (e: any) {
      Toast.show(e?.response?.data?.error || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={ms.overlay}>
      <View style={ms.card}>
        <Text style={ms.title}>修改签名</Text>
        <TextInput
          style={[ms.input, { minHeight: 80, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={(text) => setValue(text.slice(0, BIO_MAX_LENGTH))}
          placeholder="写点什么介绍一下自己吧..."
          placeholderTextColor={colors.TEXT.PLACEHOLDER}
          multiline
          maxLength={BIO_MAX_LENGTH}
        />
        <Text style={ms.charCount}>{value.length}/{BIO_MAX_LENGTH}</Text>
        <View style={ms.btnRow}>
          <TouchableOpacity style={[ms.btn, ms.btnCancel]} onPress={onClose}><Text style={ms.btnCancelText}>取消</Text></TouchableOpacity>
          <TouchableOpacity style={[ms.btn, ms.btnConfirm, loading && ms.btnDisabled]} onPress={handleSubmit} disabled={loading}><Text style={ms.btnConfirmText}>{loading ? '保存中...' : '确认'}</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- 性别选择弹框 ---
const EditGenderModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  current: string | null;
  onSuccess: () => void;
}> = ({ visible, onClose, current, onSuccess }) => {
  const { colors } = useTheme();
  const ms = useMemo(() => modalStyles(colors), [colors]);

  if (!visible) return null;

  const options = [
    { value: 'MALE', label: '男' },
    { value: 'FEMALE', label: '女' },
    { value: 'OTHER', label: '其他' },
  ];

  const handleSelect = async (v: string) => {
    try {
      await userService.updateProfile({ gender: v });
      Toast.show('性别已更新');
      onSuccess();
      onClose();
    } catch (e: any) {
      Toast.show(e?.response?.data?.error || '修改失败');
    }
  };

  return (
    <View style={ms.overlay}>
      <View style={ms.card}>
        <Text style={ms.title}>选择性别</Text>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[ms.option, current === opt.value && ms.optionSelected]}
            onPress={() => handleSelect(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[ms.optionText, current === opt.value && ms.optionTextSelected]}>{opt.label}</Text>
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

// --- 身高编辑弹框 ---
const EditHeightModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  initialValue: string;
  onSuccess: () => void;
}> = ({ visible, onClose, initialValue, onSuccess }) => {
  const { colors } = useTheme();
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const ms = useMemo(() => modalStyles(colors), [colors]);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  if (!visible) return null;

  const handleSubmit = async () => {
    const num = value ? parseFloat(value) : undefined;
    if (num !== undefined && (isNaN(num) || num < 50 || num > 300)) {
      Toast.show('身高范围：50-300cm');
      return;
    }
    setLoading(true);
    try {
      await userService.updateProfile({ height: num });
      Toast.show('身高已更新');
      onSuccess();
      onClose();
    } catch (e: any) {
      Toast.show(e?.response?.data?.error || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={ms.overlay}>
      <View style={ms.card}>
        <Text style={ms.title}>修改身高</Text>
        <TextInput
          style={ms.input}
          value={value}
          onChangeText={setValue}
          placeholder="输入身高（50-300cm）"
          placeholderTextColor={colors.TEXT.PLACEHOLDER}
          keyboardType="decimal-pad"
        />
        <View style={ms.btnRow}>
          <TouchableOpacity style={[ms.btn, ms.btnCancel]} onPress={onClose}><Text style={ms.btnCancelText}>取消</Text></TouchableOpacity>
          <TouchableOpacity style={[ms.btn, ms.btnConfirm, loading && ms.btnDisabled]} onPress={handleSubmit} disabled={loading}><Text style={ms.btnConfirmText}>{loading ? '保存中...' : '确认'}</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- 体重编辑弹框 ---
const EditWeightModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  initialValue: string;
  onSuccess: () => void;
}> = ({ visible, onClose, initialValue, onSuccess }) => {
  const { colors } = useTheme();
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const ms = useMemo(() => modalStyles(colors), [colors]);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  if (!visible) return null;

  const handleSubmit = async () => {
    const num = value ? parseFloat(value) : undefined;
    if (num !== undefined && (isNaN(num) || num < 20 || num > 300)) {
      Toast.show('体重范围：20-300kg');
      return;
    }
    setLoading(true);
    try {
      await userService.updateProfile({ weight: num });
      Toast.show('体重已更新');
      onSuccess();
      onClose();
    } catch (e: any) {
      Toast.show(e?.response?.data?.error || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={ms.overlay}>
      <View style={ms.card}>
        <Text style={ms.title}>修改体重</Text>
        <TextInput
          style={ms.input}
          value={value}
          onChangeText={setValue}
          placeholder="输入体重（20-300kg）"
          placeholderTextColor={colors.TEXT.PLACEHOLDER}
          keyboardType="decimal-pad"
        />
        <View style={ms.btnRow}>
          <TouchableOpacity style={[ms.btn, ms.btnCancel]} onPress={onClose}><Text style={ms.btnCancelText}>取消</Text></TouchableOpacity>
          <TouchableOpacity style={[ms.btn, ms.btnConfirm, loading && ms.btnDisabled]} onPress={handleSubmit} disabled={loading}><Text style={ms.btnConfirmText}>{loading ? '保存中...' : '确认'}</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- 主页面 ---
export const ProfileScreen: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditNickname, setShowEditNickname] = useState(false);
  const [showEditBio, setShowEditBio] = useState(false);
  const [showEditGender, setShowEditGender] = useState(false);
  const [showEditHeight, setShowEditHeight] = useState(false);
  const [showEditWeight, setShowEditWeight] = useState(false);

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
    divider: {
      height: 1,
      backgroundColor: colors.BORDER.LIGHT,
    },
  }), [colors]);

  const loadProfile = useCallback(async () => {
    try {
      const data = await userService.getProfile();
      setProfile(data);
    } catch {
      Toast.show('加载个人信息失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const cooldownDesc = useMemo(() => getCooldownDesc(profile?.nicknameUpdatedAt), [profile?.nicknameUpdatedAt]);

  const genderLabel = profile?.gender === 'MALE' ? '男'
    : profile?.gender === 'FEMALE' ? '女'
    : profile?.gender === 'OTHER' ? '其他' : '未设置';

  if (loading) {
    return (
      <FeatureScreenLayout>
        <FeatureHeader title="个人信息" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.PRIMARY} />
        </View>
      </FeatureScreenLayout>
    );
  }

  return (
    <FeatureScreenLayout>
      <FeatureHeader title="个人信息" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 基本信息 */}
        <Text style={dynamicStyles.sectionTitle}>基本信息</Text>
        <View style={dynamicStyles.card}>
          <SectionItem
            title="昵称"
            value={profile?.nickname || '未设置'}
            onPress={() => setShowEditNickname(true)}
          />
          <View style={dynamicStyles.divider} />
          <SectionItem
            title="签名"
            value={profile?.bio ? (profile.bio.length > 20 ? profile.bio.slice(0, 20) + '...' : profile.bio) : '未设置'}
            onPress={() => setShowEditBio(true)}
          />
        </View>

        {/* 身体数据 */}
        <Text style={dynamicStyles.sectionTitle}>身体数据</Text>
        <View style={dynamicStyles.card}>
          <SectionItem
            title="性别"
            value={genderLabel}
            onPress={() => setShowEditGender(true)}
          />
          <View style={dynamicStyles.divider} />
          <SectionItem
            title="身高"
            value={profile?.height != null ? `${profile.height}cm` : '未设置'}
            onPress={() => setShowEditHeight(true)}
          />
          <View style={dynamicStyles.divider} />
          <SectionItem
            title="体重"
            value={profile?.weight != null ? `${profile.weight}kg` : '未设置'}
            onPress={() => setShowEditWeight(true)}
          />
        </View>

        {/* 账号安全 */}
        <Text style={dynamicStyles.sectionTitle}>账号安全</Text>
        <View style={dynamicStyles.card}>
          <SectionItem
            title="账号安全"
            onPress={() => SubScreenOverlay.close(() => SubScreenOverlay.open('AccountPrivacy'))}
          />
        </View>
      </ScrollView>

      {showEditNickname && (
        <EditNicknameModal
          visible={showEditNickname}
          onClose={() => setShowEditNickname(false)}
          initialValue={profile?.nickname || ''}
          cooldownDesc={cooldownDesc}
          onSuccess={loadProfile}
        />
      )}
      {showEditBio && (
        <EditBioModal
          visible={showEditBio}
          onClose={() => setShowEditBio(false)}
          initialValue={profile?.bio || ''}
          onSuccess={loadProfile}
        />
      )}
      {showEditGender && (
        <EditGenderModal
          visible={showEditGender}
          onClose={() => setShowEditGender(false)}
          current={profile?.gender || null}
          onSuccess={loadProfile}
        />
      )}
      {showEditHeight && (
        <EditHeightModal
          visible={showEditHeight}
          onClose={() => setShowEditHeight(false)}
          initialValue={profile?.height != null ? String(profile.height) : ''}
          onSuccess={loadProfile}
        />
      )}
      {showEditWeight && (
        <EditWeightModal
          visible={showEditWeight}
          onClose={() => setShowEditWeight(false)}
          initialValue={profile?.weight != null ? String(profile.weight) : ''}
          onSuccess={loadProfile}
        />
      )}
    </FeatureScreenLayout>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.XL, paddingBottom: SPACING.XXXL * 2 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.LG,
  },
});
