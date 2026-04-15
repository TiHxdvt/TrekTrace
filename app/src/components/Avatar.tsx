/**
 * Avatar 共享组件
 * 统一处理 DiceBear 绝对 URL 和服务器相对路径，自动 fallback 到 IconUser 占位符
 */

import React, { useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../theme';
import { IconUser } from './SolarIcons';
import { APP_CONFIG } from '../config';

/** 服务器端头像路径前缀 */
const AVATAR_API_PREFIX = '/api/avatars/';

interface AvatarProps {
  uri?: string | null;
  size?: number;
  onPress?: () => void;
  loading?: boolean;
}

/**
 * 将后端返回的头像 URI 解析为可加载的完整 URL
 * - 绝对 URL（http/https）→ 直接返回
 * - 服务器相对路径（/api/avatars/...）→ 拼接服务器 base URL
 */
export function resolveAvatarUrl(uri: string | null | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  if (uri.startsWith(AVATAR_API_PREFIX)) {
    const base = APP_CONFIG.API_BASE_URL.replace(/\/api$/, '');
    return base + uri;
  }
  return uri;
}

export const Avatar: React.FC<AvatarProps> = ({ uri, size = 48, onPress, loading: loadingProp }) => {
  const [error, setError] = useState(false);
  const resolvedUri = resolveAvatarUrl(uri);

  // uri 变化时重置错误状态，以便重新尝试加载
  React.useEffect(() => {
    setError(false);
  }, [uri]);
  const showImage = resolvedUri && !error;
  const radius = size / 2;

  const content = (
    <View style={[styles.container, { width: size, height: size, borderRadius: radius }]}>
      {loadingProp ? (
        <ActivityIndicator size="small" color={COLORS.PRIMARY} />
      ) : showImage ? (
        <Image
          source={{ uri: resolvedUri! }}
          style={[styles.image, { width: size, height: size, borderRadius: radius }]}
          onError={() => setError(true)}
          resizeMode="cover"
        />
      ) : (
        <IconUser size={size * 0.5} color={COLORS.TEXT.SECONDARY} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    flex: 1,
  },
});
