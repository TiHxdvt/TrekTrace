/**
 * 图片消息气泡组件
 * 显示缩略图，点击查看大图
 *
 * 尺寸策略：优先用 props 传入的 initialWidth/initialHeight 计算显式像素尺寸，
 * 其次用全局缓存，最后用 aspectRatio 兜底。
 * 显式像素尺寸让容器从第一帧就有正确的大小，不依赖 Image 加载。
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { BORDER_RADIUS } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { APP_CONFIG } from '../../config';

const IMG_MAX_W = 200;
const IMG_MAX_H = 300;

/** 将相对 mediaUrl 转为完整可访问 URL */
export function resolveMediaUrl(mediaUrl: string): string {
  if (!mediaUrl) return '';
  if (mediaUrl.startsWith('http') || mediaUrl.startsWith('file://') || mediaUrl.startsWith('content://')) {
    return mediaUrl;
  }
  const apiBase = APP_CONFIG.API_BASE_URL;
  const hostOrigin = apiBase.replace(/\/api\/?$/, '');
  return `${hostOrigin}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`;
}

// ---- 全局图片尺寸缓存（url → { width, height }） ----
const dimensionCache = new Map<string, { width: number; height: number }>();
const pendingRequests = new Map<string, Promise<{ width: number; height: number } | null>>();

function prefetchDimension(url: string): Promise<{ width: number; height: number } | null> {
  const cached = dimensionCache.get(url);
  if (cached) return Promise.resolve(cached);

  const pending = pendingRequests.get(url);
  if (pending) return pending;

  const promise = new Promise<{ width: number; height: number } | null>((resolve) => {
    Image.getSize(
      url,
      (width, height) => {
        const dim = { width, height };
        dimensionCache.set(url, dim);
        pendingRequests.delete(url);
        resolve(dim);
      },
      () => {
        pendingRequests.delete(url);
        resolve(null);
      },
    );
  });
  pendingRequests.set(url, promise);
  return promise;
}

/** 预写入图片尺寸缓存（同时缓存原始 URL 和 resolved URL，处理 URL 变换） */
export function cacheImageDimension(url: string, width: number, height: number): void {
  if (width > 0 && height > 0) {
    const dim = { width, height };
    dimensionCache.set(url, dim);
    const resolved = resolveMediaUrl(url);
    if (resolved !== url) {
      dimensionCache.set(resolved, dim);
    }
  }
}

/** 根据原始宽高计算展示像素尺寸（受 maxWidth/maxHeight 约束） */
function calcDisplaySize(w: number, h: number): { dw: number; dh: number } {
  let dw = IMG_MAX_W;
  let dh = dw * (h / w);
  if (dh > IMG_MAX_H) {
    dh = IMG_MAX_H;
    dw = dh * (w / h);
  }
  return { dw, dh };
}

interface ChatImageMessageProps {
  mediaUrl: string;
  isMine: boolean;
  status?: string;
  initialWidth?: number;
  initialHeight?: number;
  onImagePress?: (imageUri: string) => void;
}

export const ChatImageMessage: React.FC<ChatImageMessageProps> = memo(({
  mediaUrl,
  isMine,
  status,
  initialWidth,
  initialHeight,
  onImagePress,
}) => {
  const { colors } = useTheme();
  const fullUrl = resolveMediaUrl(mediaUrl);

  const [imgError, setImgError] = useState(false);

  // 计算显式像素尺寸：props > 缓存 > 兜底
  const { displayW, displayH, hasExplicitSize } = useMemo(() => {
    if (initialWidth && initialHeight && initialWidth > 0 && initialHeight > 0) {
      const { dw, dh } = calcDisplaySize(initialWidth, initialHeight);
      return { displayW: dw, displayH: dh, hasExplicitSize: true };
    }
    const cached = dimensionCache.get(fullUrl);
    if (cached && cached.width > 0 && cached.height > 0) {
      const { dw, dh } = calcDisplaySize(cached.width, cached.height);
      return { displayW: dw, displayH: dh, hasExplicitSize: true };
    }
    return { displayW: IMG_MAX_W, displayH: 150, hasExplicitSize: false };
  }, [initialWidth, initialHeight, fullUrl]);

  const mountedRef = useRef(true);

  // 缓存未命中时异步获取尺寸并更新
  const [asyncSize, setAsyncSize] = useState<{ dw: number; dh: number } | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    if (hasExplicitSize) return;
    if (dimensionCache.has(fullUrl)) return;

    prefetchDimension(fullUrl).then(dim => {
      if (mountedRef.current && dim && dim.width > 0 && dim.height > 0) {
        setAsyncSize(calcDisplaySize(dim.width, dim.height));
      }
    });
    return () => { mountedRef.current = false; };
  }, [fullUrl, hasExplicitSize]);

  const finalW = asyncSize?.dw ?? displayW;
  const finalH = asyncSize?.dh ?? displayH;

  const handlePress = useCallback(() => {
    if (!imgError && onImagePress) onImagePress(fullUrl);
  }, [imgError, onImagePress, fullUrl]);

  return (
    <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[
          styles.container,
          {
            width: finalW,
            height: finalH,
            borderColor: isMine ? undefined : colors.BORDER.MEDIUM,
          },
          !isMine && styles.containerBorder,
        ]}
      >
        {!imgError ? (
          <Image
            source={{ uri: fullUrl }}
            style={{ width: finalW, height: finalH }}
            resizeMode="cover"
            onError={(e) => {
              setImgError(true);
            }}
          />
        ) : (
          <View style={[styles.errorPlaceholder, { width: finalW, height: finalH }]}>
            <Text style={{ color: '#fff', fontSize: 12 }}>加载失败</Text>
            <Image
              source={{ uri: fullUrl }}
              style={styles.hiddenRetryImage}
              onError={() => {}}
              onLoad={() => setImgError(false)}
            />
          </View>
        )}
      </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.LG,
    overflow: 'hidden',
  },
  containerBorder: {
    borderWidth: 1,
  },
  errorPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  hiddenRetryImage: {
    width: 1,
    height: 1,
    opacity: 0,
  },
});
