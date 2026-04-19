/**
 * 图片消息气泡组件
 * 显示缩略图，点击查看大图
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { ChatImageViewer } from './ChatImageViewer';
import { APP_CONFIG } from '../../config';

/** 将相对 mediaUrl 转为完整可访问 URL */
function resolveMediaUrl(mediaUrl: string): string {
  if (!mediaUrl) return '';
  // 已经是完整 URL 或本地文件 URI，直接返回
  if (mediaUrl.startsWith('http') || mediaUrl.startsWith('file://') || mediaUrl.startsWith('content://')) {
    return mediaUrl;
  }
  // 相对路径如 /api/chat/media/xxx.jpg → 拼接服务器 host
  const apiBase = APP_CONFIG.API_BASE_URL; // http://localhost:8080/api
  const hostOrigin = apiBase.replace(/\/api\/?$/, ''); // http://localhost:8080
  return `${hostOrigin}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`;
}

interface ChatImageMessageProps {
  mediaUrl: string;
  isMine: boolean;
  status?: string;
}

export const ChatImageMessage: React.FC<ChatImageMessageProps> = memo(({
  mediaUrl,
  isMine,
  status,
}) => {
  const { colors } = useTheme();

  const [viewerVisible, setViewerVisible] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);
  const [aspectRatio, setAspectRatio] = React.useState(1.5);

  const handlePress = useCallback(() => {
    if (!imgError) setViewerVisible(true);
  }, [imgError]);

  const fullUrl = resolveMediaUrl(mediaUrl);

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[
          styles.container,
          {
            backgroundColor: isMine ? colors.PRIMARY : colors.OVERLAY.MEDIUM,
            borderColor: isMine ? undefined : colors.BORDER.MEDIUM,
          },
          !isMine && styles.containerBorder,
        ]}
      >
        {!imgError ? (
          <Image
            source={{ uri: fullUrl }}
            style={[styles.image, { aspectRatio }]}
            resizeMode="cover"
            onLoad={(e) => {
              const { width, height } = e.nativeEvent.source;
              if (width > 0 && height > 0) {
                setAspectRatio(width / height);
              }
            }}
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.errorPlaceholder}>
            <Image
              source={{ uri: fullUrl }}
              style={styles.hiddenRetryImage}
              onError={() => {}}
              onLoad={() => setImgError(false)}
            />
          </View>
        )}
        {status === 'sending' && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      <ChatImageViewer
        visible={viewerVisible}
        imageUri={fullUrl}
        onClose={() => setViewerVisible(false)}
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.LG,
    overflow: 'hidden',
    maxWidth: 200,
    minWidth: 120,
    minHeight: 120,
  },
  containerBorder: {
    borderWidth: 1,
  },
  image: {
    width: 200,
    maxHeight: 300,
    borderRadius: BORDER_RADIUS.LG,
  },
  errorPlaceholder: {
    width: 200,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  hiddenRetryImage: {
    width: 1,
    height: 1,
    opacity: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});
