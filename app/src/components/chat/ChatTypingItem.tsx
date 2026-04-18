/**
 * 输入中动画组件
 * 三个圆点交替透明度 + 缩放，模拟"正在输入"效果
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar } from '../Avatar';
import { SPACING } from '../../theme';

interface ChatTypingItemProps {
  avatarUrl?: string;
}

const DOT_SIZE = 5;
const ANIM_DURATION = 400;
const ANIM_STAGGER = 150;

export const ChatTypingItem: React.FC<ChatTypingItemProps> = ({ avatarUrl }) => {
  const { colors } = useTheme();
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: ANIM_DURATION,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: ANIM_DURATION,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, ANIM_STAGGER);
    const a3 = animate(dot3, ANIM_STAGGER * 2);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.container}>
      <Avatar uri={avatarUrl} size={32} />
      <View style={[styles.bubble, { backgroundColor: colors.OVERLAY.MEDIUM, borderColor: colors.BORDER.MEDIUM }]}>
        <View style={styles.dots}>
          {[dot1, dot2, dot3].map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: colors.TEXT.QUATERNARY,
                  opacity: anim,
                  transform: [
                    {
                      scale: anim.interpolate({
                        inputRange: [0.3, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.SM,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.XS,
  },
  bubble: {
    borderWidth: 1,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
  },
  dots: {
    flexDirection: 'row',
    gap: SPACING.SM,
    alignItems: 'center',
    height: DOT_SIZE * 1.2,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
