/**
 * 登录页面 - 玻璃拟态设计
 * 参考 /Users/ti/trektrace/resources 中的设计风格
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { Button } from '../components/Button';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  // 表单状态
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  // 倒计时
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // 错误状态
  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [countdown]);

  // 验证手机号格式
  const validatePhone = (phoneNumber: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  };

  // 发送验证码
  const handleSendCode = async () => {
    setPhoneError('');

    if (!phone) {
      setPhoneError('请输入手机号');
      return;
    }

    if (!validatePhone(phone)) {
      setPhoneError('请输入正确的手机号');
      return;
    }

    try {
      setSendingCode(true);
      await authService.sendVerificationCode(phone);

      setCountdown(60);

      Alert.alert(
        '提示',
        '验证码已发送，请查看后端控制台',
        [{ text: '确定' }]
      );
    } catch (error: any) {
      console.error('Send code error:', error);
      Alert.alert('错误', '验证码发送失败，请稍后重试');
    } finally {
      setSendingCode(false);
    }
  };

  // 登录
  const handleLogin = async () => {
    setPhoneError('');
    setCodeError('');

    if (!phone) {
      setPhoneError('请输入手机号');
      return;
    }

    if (!validatePhone(phone)) {
      setPhoneError('请输入正确的手机号');
      return;
    }

    if (!code) {
      setCodeError('请输入验证码');
      return;
    }

    if (code.length !== 6) {
      setCodeError('验证码为6位数字');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.login(phone, code);

      await storageService.saveToken(response.token);
      await storageService.saveUser(response.user);

      onLoginSuccess();
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('登录失败', '验证码错误或已过期，请重新获取');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1c1e26" />

      {/* Background Glow Effects */}
      <View style={styles.backgroundGlow}>
        <View style={[styles.glowCircle, styles.glowBlue]} />
        <View style={[styles.glowCircle, styles.glowPurple]} />
        <View style={[styles.glowCircle, styles.glowPink]} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo and Title */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>🏔️</Text>
            </View>
            <Text style={styles.title}>途迹</Text>
            <Text style={styles.subtitle}>记录你的每一步精彩</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            {/* Phone Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>手机号</Text>
              <View style={[styles.inputWrapper, phoneError && styles.inputError]}>
                <Text style={styles.inputPrefix}>+86</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="请输入手机号"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  keyboardType="phone-pad"
                  maxLength={11}
                  selectionColor="#3b82f6"
                />
              </View>
              {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
            </View>

            {/* Code Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>验证码</Text>
              <View style={styles.codeRow}>
                <View style={[styles.inputWrapper, styles.codeInputWrapper, codeError && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={setCode}
                    placeholder="请输入验证码"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    keyboardType="number-pad"
                    maxLength={6}
                    selectionColor="#3b82f6"
                  />
                </View>
                <Button
                  title={countdown > 0 ? `${countdown}s` : '获取验证码'}
                  onPress={handleSendCode}
                  variant="secondary"
                  size="small"
                  disabled={countdown > 0 || sendingCode}
                  loading={sendingCode}
                  style={styles.codeButton}
                />
              </View>
              {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}
            </View>

            {/* Login Button */}
            <Button
              title="登录"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginButton}
            />

            {/* Terms */}
            <Text style={styles.terms}>
              登录即表示同意{' '}
              <Text style={styles.termsLink}>用户协议</Text>
              {' '}和{' '}
              <Text style={styles.termsLink}>隐私政策</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1e26',
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 500,
  },
  glowBlue: {
    top: -100,
    left: 50,
    width: 300,
    height: 300,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    opacity: 0.8,
  },
  glowPurple: {
    bottom: -50,
    right: -50,
    width: 350,
    height: 350,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
  },
  glowPink: {
    top: '40%',
    left: '50%',
    marginLeft: -150,
    width: 300,
    height: 300,
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
  },
  keyboardView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  inputPrefix: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    marginRight: 12,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeInputWrapper: {
    flex: 1,
    marginRight: 12,
  },
  codeButton: {
    minWidth: 110,
    height: 56,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 8,
    marginLeft: 4,
  },
  loginButton: {
    marginTop: 8,
    height: 56,
  },
  terms: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
  termsLink: {
    color: 'rgba(59, 130, 246, 0.8)',
  },
});
