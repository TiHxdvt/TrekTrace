/**
 * 全屏图片画廊查看器
 * FlatList 处理水平分页滑动（无闪烁），原生 touch events 处理缩放/拖动/点击
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  Text,
  FlatList,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
const DOUBLE_TAP_SCALE = 3;
const TAP_MAX_DURATION = 300;
const TAP_MAX_DISTANCE = 15;
const IMAGE_H = SCREEN_HEIGHT * 0.8;

/** 缩放时最大平移距离（基于图片实际渲染尺寸，避免极端比例图片拖出边界） */
function getMaxPan(scale: number, naturalW?: number, naturalH?: number) {
  let renderedW = SCREEN_WIDTH;
  let renderedH = IMAGE_H;

  // resizeMode="contain"：按图片原始比例算出实际渲染尺寸
  if (naturalW && naturalH && naturalW > 0 && naturalH > 0) {
    const containerRatio = SCREEN_WIDTH / IMAGE_H;
    const imageRatio = naturalW / naturalH;
    if (imageRatio > containerRatio) {
      // 图片比容器宽 → 铺满宽度，高度有空白
      renderedW = SCREEN_WIDTH;
      renderedH = SCREEN_WIDTH / imageRatio;
    } else {
      // 图片比容器窄 → 铺满高度，宽度有空白
      renderedH = IMAGE_H;
      renderedW = IMAGE_H * imageRatio;
    }
  }

  return {
    x: Math.max(0, renderedW * (scale - 1) / 2),
    y: Math.max(0, renderedH * (scale - 1) / 2),
  };
}

interface ChatImageViewerProps {
  visible: boolean;
  imageUris: string[];
  initialIndex: number;
  onClose: () => void;
}

export const ChatImageViewer: React.FC<ChatImageViewerProps> = ({
  visible,
  imageUris,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const imageScale = useRef(new Animated.Value(1)).current;
  const imageTranslateX = useRef(new Animated.Value(0)).current;
  const imageTranslateY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  // ---- Gesture state refs ----
  const baseScale = useRef(1);
  const currentScale = useRef(1);
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const lastTapTime = useRef(0);
  const isPinching = useRef(false);
  const pinchJustEnded = useRef(false);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const touchMaxDist = useRef(0);

  // Pan tracking
  const panStartX = useRef(0);
  const panStartY = useRef(0);
  const baseTranslateX = useRef(0);
  const baseTranslateY = useRef(0);
  const currentTranslateX = useRef(0);
  const currentTranslateY = useRef(0);

  // Image dimension tracking (for accurate maxPan)
  const imageSizes = useRef<Map<string, { w: number; h: number }>>(new Map());
  const currentIndexRef = useRef(0);
  const imageUrisRef = useRef<string[]>([]);

  // ---- Helpers ----
  const animateScaleTo = useCallback(
    (s: number) => {
      baseScale.current = s;
      currentScale.current = s;
      // Reset translate when scale changes
      baseTranslateX.current = 0;
      baseTranslateY.current = 0;
      currentTranslateX.current = 0;
      currentTranslateY.current = 0;
      Animated.parallel([
        Animated.spring(imageScale, {
          toValue: s,
          useNativeDriver: true,
          overshootClamping: true,
        }),
        Animated.spring(imageTranslateX, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(imageTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [imageScale, imageTranslateX, imageTranslateY],
  );

  const resetZoom = useCallback(() => {
    animateScaleTo(1);
    setScrollEnabled(true);
  }, [animateScaleTo]);

  const getDistance = (touches: readonly { pageX: number; pageY: number }[]) => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // ---- Reset on open ----
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      animateScaleTo(1);
      setScrollEnabled(true);
      isPinching.current = false;
      pinchJustEnded.current = false;
      lastTapTime.current = 0;
      imageSizes.current.clear();
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      });
    }
  }, [visible, initialIndex, animateScaleTo]);

  // Keep refs in sync for use in gesture handlers
  currentIndexRef.current = currentIndex;
  imageUrisRef.current = imageUris;

  // ---- Cleanup ----
  useEffect(() => {
    return () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    };
  }, []);

  // ---- Touch handlers (passive — don't interfere with FlatList scroll) ----
  const handleTouchStart = useCallback((e: any) => {
    const touches: readonly any[] = e.nativeEvent.touches;
    touchStartTime.current = Date.now();
    touchMaxDist.current = 0;

    if (touches.length >= 2) {
      isPinching.current = true;
      pinchJustEnded.current = false;
      pinchStartDist.current = getDistance(touches);
      pinchStartScale.current = baseScale.current;
      setScrollEnabled(false);
    } else if (touches.length === 1) {
      touchStartX.current = touches[0].pageX;
      touchStartY.current = touches[0].pageY;
      // Prepare for potential pan if zoomed
      panStartX.current = touches[0].pageX;
      panStartY.current = touches[0].pageY;
      baseTranslateX.current = currentTranslateX.current;
      baseTranslateY.current = currentTranslateY.current;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: any) => {
      const touches: readonly any[] = e.nativeEvent.touches;

      if (touches.length >= 2) {
        // Second finger added during move — start pinch
        if (!isPinching.current) {
          isPinching.current = true;
          pinchJustEnded.current = false;
          pinchStartDist.current = getDistance(touches);
          pinchStartScale.current = baseScale.current;
          setScrollEnabled(false);
        }
        const dist = getDistance(touches);
        const s = pinchStartScale.current * (dist / pinchStartDist.current);
        const clamped = Math.min(Math.max(s, 0.5), 5);
        currentScale.current = clamped;
        imageScale.setValue(clamped);
      } else if (touches.length === 1 && !isPinching.current && !pinchJustEnded.current) {
        const dx = touches[0].pageX - touchStartX.current;
        const dy = touches[0].pageY - touchStartY.current;
        touchMaxDist.current = Math.max(touchMaxDist.current, Math.sqrt(dx * dx + dy * dy));

        if (baseScale.current > 1.15) {
          // Pan the zoomed image
          const panDx = touches[0].pageX - panStartX.current;
          const panDy = touches[0].pageY - panStartY.current;
          const uri = imageUrisRef.current[currentIndexRef.current];
          const size = uri ? imageSizes.current.get(uri) : undefined;
          const maxPan = getMaxPan(baseScale.current, size?.w, size?.h);
          const tx = Math.max(-maxPan.x, Math.min(maxPan.x, baseTranslateX.current + panDx));
          const ty = Math.max(-maxPan.y, Math.min(maxPan.y, baseTranslateY.current + panDy));
          currentTranslateX.current = tx;
          currentTranslateY.current = ty;
          imageTranslateX.setValue(tx);
          imageTranslateY.setValue(ty);
        }
      }
    },
    [imageScale, imageTranslateX, imageTranslateY],
  );

  const handleTouchEnd = useCallback(
    (e: any) => {
      const touches: readonly any[] = e.nativeEvent.touches;

      // Still have fingers down — handle partial lift during pinch
      if (touches.length > 0) {
        if (isPinching.current && touches.length < 2) {
          isPinching.current = false;
          pinchJustEnded.current = true;
          let s = currentScale.current;
          s = Math.min(Math.max(s, 1), 5);
          if (s < 1.15) s = 1;
          animateScaleTo(s);
          if (s <= 1.15) setScrollEnabled(true);
        }
        return;
      }

      // ---- All fingers lifted ----

      // End pinch if still active
      if (isPinching.current) {
        isPinching.current = false;
        pinchJustEnded.current = true;
        let s = currentScale.current;
        s = Math.min(Math.max(s, 1), 5);
        if (s < 1.15) s = 1;
        animateScaleTo(s);
        if (s <= 1.15) setScrollEnabled(true);
        return;
      }

      // Save pan position after drag
      if (baseScale.current > 1.15) {
        baseTranslateX.current = currentTranslateX.current;
        baseTranslateY.current = currentTranslateY.current;
      }

      // ---- Tap detection ----
      if (pinchJustEnded.current) {
        pinchJustEnded.current = false;
        return;
      }

      const duration = Date.now() - touchStartTime.current;
      if (duration > TAP_MAX_DURATION || touchMaxDist.current > TAP_MAX_DISTANCE) {
        return; // Not a tap — was a swipe or drag
      }

      const now = Date.now();

      // Cancel pending single tap
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }

      if (now - lastTapTime.current < 300) {
        // Double tap — toggle zoom
        lastTapTime.current = 0;
        if (baseScale.current > 1.15) {
          resetZoom();
        } else {
          animateScaleTo(DOUBLE_TAP_SCALE);
          setScrollEnabled(false);
        }
      } else {
        // Single tap — always close
        lastTapTime.current = now;
        singleTapTimer.current = setTimeout(() => {
          singleTapTimer.current = null;
          onClose();
        }, 300);
      }
    },
    [animateScaleTo, resetZoom, onClose],
  );

  const handleTouchCancel = useCallback(() => {
    isPinching.current = false;
    pinchJustEnded.current = false;
    resetZoom();
  }, [resetZoom]);

  // ---- FlatList callbacks ----
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <View style={styles.itemContainer}>
        <Animated.Image
          source={{ uri: item }}
          onLoad={(e) => {
            const src = e.nativeEvent.source;
            if (src.width && src.height) {
              imageSizes.current.set(item, { w: src.width, h: src.height });
            }
          }}
          style={[
            styles.image,
            index === currentIndex ? {
              transform: [
                { translateX: imageTranslateX },
                { translateY: imageTranslateY },
                { scale: imageScale },
              ],
            } : undefined,
          ]}
          resizeMode="contain"
        />
      </View>
    ),
    [currentIndex, imageScale, imageTranslateX, imageTranslateY],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback(
    (_: string, index: number) => String(index),
    [],
  );

  if (imageUris.length === 0) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      hardwareAccelerated
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <View
        style={styles.backdrop}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        {/* Counter */}
        <View style={styles.counterContainer} pointerEvents="none">
          <Text style={styles.counterText}>
            {currentIndex + 1} / {imageUris.length}
          </Text>
        </View>

        {/* FlatList handles horizontal paging — no flash */}
        <FlatList
          ref={flatListRef}
          data={imageUris}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          scrollEnabled={scrollEnabled}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={getItemLayout}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          windowSize={3}
          maxToRenderPerBatch={1}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  counterContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  counterText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  itemContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: IMAGE_H,
  },
});
