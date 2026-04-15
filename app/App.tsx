/**
 * 途迹 TrekTrace - 主应用入口
 */

import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { DialogRoot } from './src/components/Dialog';
import { ToastRoot } from './src/components/Toast';
import { DrawerOverlayRoot } from './src/components/DrawerOverlay';
import { ThemeProvider } from './src/contexts/ThemeContext';

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor="#1c1e26" />
          <AppNavigator />
          <DialogRoot />
          <ToastRoot />
          <DrawerOverlayRoot />
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
