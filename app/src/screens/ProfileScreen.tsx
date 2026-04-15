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
import { StackNavigationProp } from '@react-navigation/stack';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { DrawerStackParamList } from '../navigation/DrawerStack';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { FeatureHeader } from '../components/FeatureScreenOverlay';
import { FeatureScreenLayout } from '../components/FeatureScreenLayout';
import { userService, ProfileData } from '../services/userService';
import { storageService } from '../services/storageService';
import { Toast } from '../components/Toast';
import { Dialog } from '../components/Dialog';
import { Avatar } from '../components/Avatar';

type NavProp = StackNavigationProp<DrawerStackParamList, 'Profile'>;

const IMAGE_PICKER_OPTIONS = {
  mediaType: 'photo' as const,
  quality: 0.8 as const,
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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      const data = await userService.getProfile();
      setProfile(data);
      setNickname(data.nickname || '');
      setAvatarUrl(data.avatarUrl || '');
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
      const updated = await userService.updateProfile({
        nickname: nickname || undefined,
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
          <ActivityIndicator color={COLORS.PRIMARY} />
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

        {/* Nickname */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>昵称</Text>
            {cooldownDesc && <Text style={styles.cooldownText}>{cooldownDesc}</Text>}
          </View>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={(text) => setNickname(truncateToWidth(text, NICKNAME_MAX_LENGTH))}
            placeholder="中文、字母、数字、下划线，最长7个中文"
            placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
            editable={!cooldownDesc}
          />
        </View>

        {/* Phone (read-only) */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, styles.labelMargin]}>手机号</Text>
          <Text style={styles.valueText}>{profile?.phone || '-'}</Text>
        </View>

        {/* Registration date */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, styles.labelMargin]}>注册时间</Text>
          <Text style={styles.valueText}>
            {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('zh-CN') : '-'}
          </Text>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveBtnText}>{saving ? '保存中...' : '保存'}</Text>
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
  fieldGroup: {
    marginBottom: SPACING.XL,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.SM,
  },
  label: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.TEXT.QUATERNARY,
  },
  labelMargin: {
    marginBottom: SPACING.SM,
  },
  input: {
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    color: COLORS.TEXT.PRIMARY,
  },
  cooldownText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.WARNING,
  },
  valueText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    color: COLORS.TEXT.SECONDARY,
    paddingVertical: SPACING.SM,
  },
  saveBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: BORDER_RADIUS.LG,
    paddingVertical: SPACING.LG,
    alignItems: 'center',
    marginTop: SPACING.XXL,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
});
