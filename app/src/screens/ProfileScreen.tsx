/**
 * 个人信息页面
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DrawerStackParamList } from '../navigation/DrawerStack';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { FeatureHeader } from '../components/FeatureScreenOverlay';
import { userService, ProfileData } from '../services/userService';
import { storageService } from '../services/storageService';
import { Toast } from '../components/Toast';
import { IconUser } from '../components/SolarIcons';

type NavProp = NativeStackNavigationProp<DrawerStackParamList, 'Profile'>;

export const ProfileScreen: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await userService.updateProfile({
        nickname: nickname || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      setProfile(updated);
      // Update local storage
      const user = await storageService.getUser();
      if (user) {
        await storageService.saveUser({ ...user, nickname: updated.nickname, avatarUrl: updated.avatarUrl });
      }
      Toast.show('保存成功');
    } catch {
      Toast.show('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <FeatureHeader title="个人信息" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.PRIMARY} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FeatureHeader title="个人信息" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarLarge}>
            <IconUser size={48} color={COLORS.TEXT.SECONDARY} />
          </View>
        </View>

        {/* Nickname */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>昵称</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="请输入昵称"
            placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
          />
        </View>

        {/* Avatar URL */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>头像链接</Text>
          <TextInput
            style={styles.input}
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder="请输入头像图片 URL"
            placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
            autoCapitalize="none"
          />
        </View>

        {/* Phone (read-only) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>手机号</Text>
          <Text style={styles.valueText}>{profile?.phone || '-'}</Text>
        </View>

        {/* Registration date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>注册时间</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.XL, paddingBottom: SPACING.XXXL * 2 },
  avatarSection: { alignItems: 'center', marginVertical: SPACING.XXL },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldGroup: {
    marginBottom: SPACING.XL,
  },
  label: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.TEXT.QUATERNARY,
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
