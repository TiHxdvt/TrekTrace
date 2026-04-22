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
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { FeatureHeader } from '../components/FeatureScreenOverlay';
import { FeatureScreenLayout } from '../components/FeatureScreenLayout';
import { userService, ProfileData } from '../services/userService';
import { storageService } from '../services/storageService';
import { Toast } from '../components/Toast';
import { Dialog } from '../components/Dialog';
import { Avatar } from '../components/Avatar';

import { IconAltArrowRight } from '../components/SolarIcons';
import { SubScreenOverlay } from '../components/SubScreenOverlay';

type NavProp = { goBack: () => void };

const IMAGE_PICKER_OPTIONS = {
  mediaType: 'photo' as const,
  quality: 0.7 as const,
  maxWidth: 512,
  maxHeight: 512,
};

const NICKNAME_MAX_LENGTH = 14;
const NICKNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** 计算昵称显示宽度（中文算2，其他算1） */
function nicknameWidth(s: string): number {
  let w = 0;
  for (let i = 0; i < s.length; i++) {
    w += s.charCodeAt(i) > 0x7F ? 2 : 1;
  }
  return w;
}

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

export const ProfileScreen: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [weight, setWeight] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [heightVal, setHeightVal] = useState('');

  const dynamicStyles = useMemo(() => StyleSheet.create({
    sectionTitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
      fontWeight: '500',
      color: colors.TEXT.QUATERNARY,
      marginBottom: SPACING.MD,
      marginTop: SPACING.SM,
    },
    card: {
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      borderRadius: BORDER_RADIUS.LG,
      paddingHorizontal: SPACING.LG,
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
    cooldownText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.WARNING,
    },
    itemTitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.SECONDARY,
    },
    itemValue: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
    },
    divider: {
      height: 1,
      backgroundColor: colors.BORDER.LIGHT,
    },
    saveBtn: {
      backgroundColor: colors.PRIMARY,
      borderRadius: BORDER_RADIUS.LG,
      paddingVertical: SPACING.LG,
      alignItems: 'center',
      marginTop: SPACING.XXL,
    },
    saveBtnText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      fontWeight: '600',
      color: '#ffffff',
    },
  }), [colors]);

  const loadProfile = useCallback(async () => {
    try {
      const data = await userService.getProfile();
      setProfile(data);
      setNickname(data.nickname || '');
      setAvatarUrl(data.avatarUrl || '');
      setWeight(data.weight != null ? String(data.weight) : '');
      setBio(data.bio || '');
      setGender(data.gender || null);
      setHeightVal(data.height != null ? String(data.height) : '');
    } catch {
      Toast.show('加载个人信息失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleAvatarPress = () => {
    Dialog.show('更换头像', '请选择头像来源', [
      { text: '取消', style: 'cancel' },
      {
        text: '拍照',
        onPress: () => handlePickImage('camera'),
      },
      {
        text: '从相册选择',
        onPress: () => handlePickImage('library'),
      },
    ]);
  };

  const handlePickImage = async (source: 'camera' | 'library') => {
    // Android 相机需要运行时权限
    if (source === 'camera' && Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: '相机权限',
          message: '需要相机权限来拍摄头像照片',
          buttonNeutral: '稍后再问',
          buttonNegative: '拒绝',
          buttonPositive: '允许',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Toast.show('需要相机权限才能拍照');
        return;
      }
    }

    const result = source === 'camera'
      ? await launchCamera(IMAGE_PICKER_OPTIONS)
      : await launchImageLibrary(IMAGE_PICKER_OPTIONS);

    if (result.didCancel || result.errorCode) {
      if (result.errorCode) {
        Toast.show(`选择图片失败: ${result.errorMessage || result.errorCode}`);
      }
      return;
    }

    const asset = result.assets?.[0];
    if (!asset?.uri || !asset?.type) return;

    setUploading(true);
    try {
      const newUrl = await userService.uploadAvatar(asset.uri, asset.type);
      setAvatarUrl(newUrl);
      if (profile) {
        setProfile({ ...profile, avatarUrl: newUrl });
      }
      const user = await storageService.getUser();
      if (user) {
        await storageService.saveUser({ ...user, avatarUrl: newUrl });
      }
      Toast.show('头像已更新');
    } catch {
      Toast.show('头像上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const weightNum = weight ? parseFloat(weight) : undefined;
      const heightNum = heightVal ? parseFloat(heightVal) : undefined;
      if (weightNum !== undefined && (weightNum < 20 || weightNum > 300)) {
        Toast.show('体重范围：20-300kg');
        setSaving(false);
        return;
      }
      if (heightNum !== undefined && (heightNum < 50 || heightNum > 300)) {
        Toast.show('身高范围：50-300cm');
        setSaving(false);
        return;
      }
      const updated = await userService.updateProfile({
        nickname: nickname || undefined,
        weight: weightNum && !isNaN(weightNum) ? weightNum : undefined,
        bio: bio || undefined,
        gender: gender || undefined,
        height: heightNum && !isNaN(heightNum) ? heightNum : undefined,
      });
      setProfile(updated);
      // Update local storage
      const user = await storageService.getUser();
      if (user) {
        await storageService.saveUser({ ...user, nickname: updated.nickname, avatarUrl: updated.avatarUrl });
      }
      Toast.show('保存成功');
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || '保存失败';
      Toast.show(msg);
    } finally {
      setSaving(false);
    }
  };

  const cooldownDesc = useMemo(() => getCooldownDesc(profile?.nicknameUpdatedAt), [profile?.nicknameUpdatedAt]);

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
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Avatar uri={avatarUrl} size={96} onPress={handleAvatarPress} loading={uploading} />
        </View>

        {/* 基本信息 */}
        <Text style={dynamicStyles.sectionTitle}>基本信息</Text>
        <View style={dynamicStyles.card}>
          {/* 昵称（可编辑） */}
          <View style={styles.editSection}>
            <View style={styles.editLabelRow}>
              <Text style={dynamicStyles.itemTitle}>昵称</Text>
              {cooldownDesc && <Text style={dynamicStyles.cooldownText}>{cooldownDesc}</Text>}
            </View>
            <TextInput
              style={dynamicStyles.input}
              value={nickname}
              onChangeText={(text) => setNickname(truncateToWidth(text, NICKNAME_MAX_LENGTH))}
              placeholder="中文、字母、数字、下划线，最长7个中文"
              placeholderTextColor={colors.TEXT.PLACEHOLDER}
              editable={!cooldownDesc}
            />
          </View>

          <View style={dynamicStyles.divider} />

          {/* 账号 */}
          <View style={styles.item}>
            <Text style={dynamicStyles.itemTitle}>途迹账号</Text>
            <Text style={dynamicStyles.itemValue}>{profile?.account != null ? profile.account : '-'}</Text>
          </View>

          <View style={dynamicStyles.divider} />

          {/* 手机号 */}
          <View style={styles.item}>
            <Text style={dynamicStyles.itemTitle}>手机号</Text>
            <Text style={dynamicStyles.itemValue}>{profile?.phone || '-'}</Text>
          </View>

          <View style={dynamicStyles.divider} />

          {/* 注册时间 */}
          <View style={styles.item}>
            <Text style={dynamicStyles.itemTitle}>注册时间</Text>
            <Text style={dynamicStyles.itemValue}>
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('zh-CN') : '-'}
            </Text>
          </View>
        </View>

        {/* 个人简介 */}
        <Text style={dynamicStyles.sectionTitle}>个人简介</Text>
        <View style={dynamicStyles.card}>
          <View style={styles.editSection}>
            <TextInput
              style={[dynamicStyles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={bio}
              onChangeText={(text) => setBio(text.slice(0, 200))}
              placeholder="写点什么介绍一下自己吧..."
              placeholderTextColor={colors.TEXT.PLACEHOLDER}
              multiline
              maxLength={200}
            />
            <Text style={dynamicStyles.itemValue}>{bio.length}/200</Text>
          </View>
        </View>

        {/* 身体数据 */}
        <Text style={dynamicStyles.sectionTitle}>身体数据</Text>
        <View style={dynamicStyles.card}>
          {/* 性别 */}
          <View style={styles.editSection}>
            <Text style={[dynamicStyles.itemTitle, { marginBottom: SPACING.SM }]}>性别</Text>
            <View style={styles.genderRow}>
              {[
                { key: 'MALE', label: '男' },
                { key: 'FEMALE', label: '女' },
                { key: 'OTHER', label: '其他' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.genderBtn,
                    {
                      backgroundColor: gender === opt.key ? colors.PRIMARY : colors.OVERLAY.MEDIUM,
                      borderColor: gender === opt.key ? colors.PRIMARY : colors.BORDER.MEDIUM,
                    },
                  ]}
                  onPress={() => setGender(gender === opt.key ? null : opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
                    color: gender === opt.key ? '#ffffff' : colors.TEXT.SECONDARY,
                  }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={dynamicStyles.divider} />

          <View style={styles.editSection}>
            <View style={styles.editLabelRow}>
              <Text style={dynamicStyles.itemTitle}>身高</Text>
              <Text style={dynamicStyles.itemValue}>cm</Text>
            </View>
            <TextInput
              style={dynamicStyles.input}
              value={heightVal}
              onChangeText={setHeightVal}
              placeholder="输入身高（50-300cm）"
              placeholderTextColor={colors.TEXT.PLACEHOLDER}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={dynamicStyles.divider} />

          <View style={styles.editSection}>
            <View style={styles.editLabelRow}>
              <Text style={dynamicStyles.itemTitle}>体重</Text>
              <Text style={dynamicStyles.itemValue}>kg</Text>
            </View>
            <TextInput
              style={dynamicStyles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="输入体重（20-300kg）"
              placeholderTextColor={colors.TEXT.PLACEHOLDER}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* 隐私设置 */}
        <TouchableOpacity
          style={[dynamicStyles.card, styles.item]}
          onPress={() => SubScreenOverlay.close(() => SubScreenOverlay.open('AccountPrivacy'))}
          activeOpacity={0.7}
        >
          <Text style={dynamicStyles.itemTitle}>隐私设置</Text>
          <IconAltArrowRight size={18} color={colors.TEXT.QUINARY} />
        </TouchableOpacity>

        {/* Save button */}
        <TouchableOpacity
          style={[dynamicStyles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={dynamicStyles.saveBtnText}>{saving ? '保存中...' : '保存'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </FeatureScreenLayout>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.XL, paddingBottom: SPACING.XXXL * 2 },
  avatarSection: { alignItems: 'center', marginVertical: SPACING.XXL },
  editSection: {
    paddingVertical: SPACING.LG,
  },
  editLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.SM,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.LG,
  },
  genderRow: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  genderBtn: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
  },
  saveBtnDisabled: { opacity: 0.5 },
});
