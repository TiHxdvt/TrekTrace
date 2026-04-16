/**
 * DrawerStack 导航器
 *
 * Stack 只包含 Home + 子功能页面
 * Drawer 是独立覆盖层 (DrawerOverlay)，不在 Stack 中
 *
 * 子页面使用标准 forHorizontalIOS（最主流的 push 动画）
 * 浮空导航栏由 FeatureScreenLayout 自动控制
 */

import React from 'react';
import {
  createStackNavigator,
  CardStyleInterpolators,
} from '@react-navigation/stack';
import { COLORS } from '../theme';
import { ActivityScreen } from '../screens/ActivityScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { DataManagementScreen } from '../screens/DataManagementScreen';
import { NotificationScreen } from '../screens/NotificationScreen';
import { AccountPrivacyScreen } from '../screens/AccountPrivacyScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { PermissionScreen } from '../screens/PermissionScreen';
import { ChatScreen } from '../screens/ChatScreen';

export type DrawerStackParamList = {
  Home: undefined;
  Profile: undefined;
  DataManagement: undefined;
  Notification: undefined;
  AccountPrivacy: undefined;
  Friends: undefined;
  Permission: undefined;
  Chat: { conversationId: number; friendNickname?: string; friendAvatarUrl?: string; friendUserId: number };
};

const Stack = createStackNavigator<DrawerStackParamList>();

// iOS 风格弹簧动画
const springConfig = {
  animation: 'spring' as const,
  config: {
    damping: 26,
    stiffness: 320,
    mass: 0.8,
    overshootClamping: true,
  },
};

const subScreenOptions = {
  transitionSpec: { open: springConfig, close: springConfig },
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
  gestureDirection: 'horizontal' as const,
};

export const DrawerStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.BACKGROUND },
      }}
    >
      <Stack.Screen name="Home" component={ActivityScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={subScreenOptions} />
      <Stack.Screen name="DataManagement" component={DataManagementScreen} options={subScreenOptions} />
      <Stack.Screen name="Notification" component={NotificationScreen} options={subScreenOptions} />
      <Stack.Screen name="AccountPrivacy" component={AccountPrivacyScreen} options={subScreenOptions} />
      <Stack.Screen name="Friends" component={FriendsScreen} options={subScreenOptions} />
      <Stack.Screen name="Permission" component={PermissionScreen} options={subScreenOptions} />
      <Stack.Screen name="Chat" component={ChatScreen} options={subScreenOptions} />
    </Stack.Navigator>
  );
};
