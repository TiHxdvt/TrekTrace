/**
 * DrawerStack 导航器
 * - 以 ActivityScreen 为根页面
 * - Drawer 页面：从左侧滑入
 * - 子功能页面：渐隐渐现
 * - 所有子页面支持返回手势
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityScreen } from '../screens/ActivityScreen';
import { DrawerScreen } from '../screens/DrawerScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { DataManagementScreen } from '../screens/DataManagementScreen';
import { NotificationScreen } from '../screens/NotificationScreen';
import { AccountPrivacyScreen } from '../screens/AccountPrivacyScreen';
import { FriendsScreen } from '../screens/FriendsScreen';

export type DrawerStackParamList = {
  Home: undefined;
  Drawer: undefined;
  Profile: undefined;
  DataManagement: undefined;
  Notification: undefined;
  AccountPrivacy: undefined;
  Friends: undefined;
};

const Stack = createNativeStackNavigator<DrawerStackParamList>();

export const DrawerStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Home"
        component={ActivityScreen}
        options={{
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="Drawer"
        component={DrawerScreen}
        options={{
          animation: 'slide_from_left',
          gestureDirection: 'horizontal',
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          animation: 'fade',
          gestureDirection: 'horizontal',
        }}
      />
      <Stack.Screen
        name="DataManagement"
        component={DataManagementScreen}
        options={{
          animation: 'fade',
          gestureDirection: 'horizontal',
        }}
      />
      <Stack.Screen
        name="Notification"
        component={NotificationScreen}
        options={{
          animation: 'fade',
          gestureDirection: 'horizontal',
        }}
      />
      <Stack.Screen
        name="AccountPrivacy"
        component={AccountPrivacyScreen}
        options={{
          animation: 'fade',
          gestureDirection: 'horizontal',
        }}
      />
      <Stack.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          animation: 'fade',
          gestureDirection: 'horizontal',
        }}
      />
    </Stack.Navigator>
  );
};
