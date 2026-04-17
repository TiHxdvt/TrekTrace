/**
 * 途迹 TrekTrace - 主应用入口
 */

// Polyfill: @stomp/stompjs 依赖 TextDecoder，Hermes 引擎未内置
import { TextDecoder, TextEncoder } from 'text-encoding';
if (typeof global.TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}
if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}

import React from 'react';
import { StatusBar, StyleSheet, BackHandler } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { DialogRoot } from './src/components/Dialog';
import { ToastRoot } from './src/components/Toast';
import { DrawerOverlayRoot, DrawerOverlay } from './src/components/DrawerOverlay';
import { ChatOverlayRoot, ChatOverlay } from './src/components/ChatOverlay';
import { SubScreenOverlayRoot, SubScreenOverlay } from './src/components/SubScreenOverlay';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

// 模块顶层注册 BackHandler：在所有组件 useEffect 之前注册
// BackHandler FIFO 触发，先注册的先执行
// 这样 overlay 拦截一定在 React Navigation 的 useBackButton 之前
BackHandler.addEventListener('hardwareBackPress', () => {
  if (ChatOverlay.isOpen) { ChatOverlay.close(); return true; }
  if (SubScreenOverlay.isOpen) { SubScreenOverlay.close(); return true; }
  if (DrawerOverlay.isOpen) { DrawerOverlay.close(); return true; }
  return false;
});

function ThemedStatusBar() {
  const { colors, isDarkMode } = useTheme();
  return (
    <StatusBar
      barStyle={isDarkMode ? 'light-content' : 'dark-content'}
      backgroundColor={colors.BACKGROUND}
    />
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
        <NavigationContainer theme={{ colors: { background: 'transparent' } } as any}>
          <ThemedStatusBar />
          <AppNavigator />
          <DialogRoot />
          <ToastRoot />
          <DrawerOverlayRoot />
          <SubScreenOverlayRoot />
          <ChatOverlayRoot />
        </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
