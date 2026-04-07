/**
 * 登录页面
 * 实现手机号 + 验证码登录功能
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
} from 'react-native';
import { Button } from '../components/Button';
import { PhoneInput } from '../components/PhoneInput';
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
    // 测试模式：直接提示
    setCountdown(60);
    Alert.alert('提示', '验证码: 123456（测试模式）', [{ text: '确定' }]);
  };

  // 登录
  const handleLogin = async () => {
    // 清除错误
    setPhoneError('');
    setCodeError('');

    // 验证
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

      // 保存 token 和用户信息
      await storageService.saveToken(response.token);
      await storageService.saveUser(response.user);

      // 登录成功
      onLoginSuccess();
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('登录失败', '验证码错误或已过期，请重新获取');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>途迹</Text>
          <Text style={styles.subtitle}>户外运动记录</Text>
        </View>

        <View style={styles.form}>
          <PhoneInput
            value={phone}
            onChangeText={setPhone}
            error={phoneError}
          />

          <View style={styles.codeContainer}>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={setCode}
              placeholder="请输入验证码"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              keyboardType="number-pad"
              maxLength={6}
              selectionColor="#3b82f6"
            />
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

          <Button
            title="登录"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            登录即表示同意用户协议和隐私政策
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1e26',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    marginBottom: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  form: {
    marginBottom: 40,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  codeInput: {
    flex: 1,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginRight: 12,
  },
  codeButton: {
    minWidth: 110,
  },
  loginButton: {
    marginTop: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 12,
    marginLeft: 4,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
});
