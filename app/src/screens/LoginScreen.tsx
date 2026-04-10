/**
 * 登录页面 - 玻璃拟态设计
 * 支持验证码登录和密码登录两种模式
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
  TouchableOpacity,
} from 'react-native';
import { Button } from '../components/Button';
import { FullScreenBlur } from '../components/FullScreenBlur';
import { IconEyeClosed, IconEyeScan } from '../components/SolarIcons';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY, SPACING } from '../theme';

type LoginMode = 'sms' | 'password';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  // 登录模式
  const [loginMode, setLoginMode] = useState<LoginMode>('sms');

  // 表单状态 - 验证码模式
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  // 表单状态 - 密码模式
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 倒计时
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // 错误状态
  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [accountError, setAccountError] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

  // 切换模式时清空表单和错误
  const handleSwitchMode = (mode: LoginMode) => {
    setLoginMode(mode);
    setPhoneError('');
    setCodeError('');
    setAccountError('');
    setPasswordError('');
    if (mode === 'sms') {
      setAccount('');
      setPassword('');
    } else {
      setPhone('');
      setCode('');
    }
  };

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

  // 验证码登录
  const handleSmsLogin = async () => {
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

  // 密码登录
  const handlePasswordLogin = async () => {
    setAccountError('');
    setPasswordError('');

    if (!account) {
      setAccountError('请输入手机号');
      return;
    }

    if (!validatePhone(account)) {
      setAccountError('请输入正确的手机号');
      return;
    }

    if (!password) {
      setPasswordError('请输入密码');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.loginWithPassword(account, password);

      await storageService.saveToken(response.token);
      await storageService.saveUser(response.user);

      onLoginSuccess();
    } catch (error: any) {
      console.error('Password login error:', error);
      Alert.alert('登录失败', '账号或密码错误');
    } finally {
      setLoading(false);
    }
  };

  // 统一登录处理
  const handleLogin = () => {
    if (loginMode === 'sms') {
      handleSmsLogin();
    } else {
      handlePasswordLogin();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BACKGROUND} />

      {/* Background Glow Effects */}
      <View style={styles.backgroundGlow}>
        <View style={[styles.glowCircle, styles.glowBlue]} />
        <View style={[styles.glowCircle, styles.glowPurple]} />
        <View style={[styles.glowCircle, styles.glowPink]} />
      </View>

      {/* 全屏模糊层 */}
      <FullScreenBlur />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardContainer}>
            <View style={styles.formContainer}>
              {/* Form Header */}
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>登录</Text>
                <Text style={styles.formSubtitle}>欢迎回来，继续你的户外探索</Text>
              </View>

              {/* SMS Login Form */}
              {loginMode === 'sms' && (
                <View style={styles.formFields}>
                  {/* Phone Input */}
                  <View style={styles.inputContainer}>
                    <View style={[styles.inputWrapper, phoneError && styles.inputError]}>
                      <Text style={styles.inputPrefix}>+86</Text>
                      <View style={styles.inputDivider} />
                      <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="请输入手机号"
                        placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                        keyboardType="phone-pad"
                        maxLength={11}
                        selectionColor={COLORS.PRIMARY}
                      />
                    </View>
                    {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
                  </View>

                  {/* Code Input */}
                  <View style={styles.inputContainer}>
                    <View style={styles.codeRow}>
                      <View style={[styles.inputWrapper, styles.codeInputWrapper, codeError && styles.inputError]}>
                        <TextInput
                          style={styles.input}
                          value={code}
                          onChangeText={setCode}
                          placeholder="请输入验证码"
                          placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                          keyboardType="number-pad"
                          maxLength={6}
                          selectionColor={COLORS.PRIMARY}
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
                </View>
              )}

              {/* Password Login Form */}
              {loginMode === 'password' && (
                <View style={styles.formFields}>
                  {/* Account Input */}
                  <View style={styles.inputContainer}>
                    <View style={[styles.inputWrapper, accountError && styles.inputError]}>
                      <Text style={styles.inputPrefix}>+86</Text>
                      <View style={styles.inputDivider} />
                      <TextInput
                        style={styles.input}
                        value={account}
                        onChangeText={setAccount}
                        placeholder="请输入手机号"
                        placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                        keyboardType="phone-pad"
                        maxLength={11}
                        selectionColor={COLORS.PRIMARY}
                      />
                    </View>
                    {accountError ? <Text style={styles.errorText}>{accountError}</Text> : null}
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputContainer}>
                    <View style={[styles.inputWrapper, passwordError && styles.inputError]}>
                      <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="请输入密码"
                        placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                        secureTextEntry={!showPassword}
                        selectionColor={COLORS.PRIMARY}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}
                        activeOpacity={0.7}
                      >
                        {showPassword ? (
                          <IconEyeScan size={20} color={COLORS.TEXT.TERTIARY} />
                        ) : (
                          <IconEyeClosed size={20} color={COLORS.TEXT.TERTIARY} />
                        )}
                      </TouchableOpacity>
                    </View>
                    {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                  </View>
                </View>
              )}

                {/* Login Button */}
                <Button
                  title="登录"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={loading}
                  style={styles.loginButton}
                />

                {/* Switch Login Mode */}
                <View style={styles.switchModeRow}>
                  <Text style={styles.switchModeText}>
                    {loginMode === 'sms' ? '账号密码登录' : '验证码登录'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleSwitchMode(loginMode === 'sms' ? 'password' : 'sms')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.switchModeLink}>切换</Text>
                  </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>其他登录方式</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Social Login (Placeholder) */}
                {/* TODO: 接入微信/Apple 等第三方登录 */}
                <View style={styles.socialContainer}>
                  <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                    <View style={styles.socialIconWrapper}>
                      <Text style={styles.socialIcon}>W</Text>
                    </View>
                    <Text style={styles.socialLabel}>微信</Text>
                  </TouchableOpacity>
                </View>

                {/* Bottom Area */}
                {/* TODO: 接入忘记密码流程 */}
                <TouchableOpacity style={styles.forgotPasswordRow} activeOpacity={0.7}>
                  <Text style={styles.forgotPasswordText}>忘记密码</Text>
                </TouchableOpacity>

                <Text style={styles.autoRegisterHint}>
                  未注册手机号将自动创建账号
                </Text>

                {/* Terms */}
                {/* TODO: 接入用户协议和隐私政策页面 */}
                <Text style={styles.terms}>
                  登录即表示同意{' '}
                  <Text style={styles.termsLink}>用户协议</Text>
                  {' '}和{' '}
                  <Text style={styles.termsLink}>隐私政策</Text>
                </Text>
              </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: BORDER_RADIUS.FULL,
  },
  glowBlue: {
    top: -100,
    left: 50,
    width: 300,
    height: 300,
    backgroundColor: COLORS.GRADIENT.BLUE,
    opacity: 0.8,
  },
  glowPurple: {
    bottom: -50,
    right: -50,
    width: 350,
    height: 350,
    backgroundColor: COLORS.GRADIENT.PURPLE,
  },
  glowPink: {
    top: '40%',
    left: '50%',
    marginLeft: -150,
    width: 300,
    height: 300,
    backgroundColor: COLORS.GRADIENT.PINK_MID,
  },
  keyboardView: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.XXL,
    paddingVertical: 40,
  },
  cardContainer: {
    maxWidth: 380,
    width: '100%',
    alignSelf: 'center',
  },
  formContainer: {
    paddingHorizontal: SPACING.XXL,
    paddingVertical: SPACING.XXXL,
  },

  // Form Header
  formHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  formTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XXXL,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.TEXT.TERTIARY,
    fontWeight: '400',
  },

  // Mode Tabs
  switchModeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.LG,
    gap: SPACING.XS,
  },
  switchModeText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
  },
  switchModeLink: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },

  // Form Fields
  formFields: {
    marginBottom: SPACING.XS,
  },
  inputContainer: {
    marginBottom: SPACING.LG,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    borderRadius: BORDER_RADIUS.LG,
    paddingHorizontal: SPACING.LG,
    height: 48,
  },
  inputError: {
    borderColor: COLORS.ERROR_OVERLAY.BORDER,
    backgroundColor: COLORS.ERROR_OVERLAY.BACKGROUND,
  },
  inputPrefix: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    color: COLORS.TEXT.TERTIARY,
    fontWeight: '500',
  },
  inputDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.BORDER.MEDIUM,
    marginHorizontal: SPACING.MD,
  },
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    color: COLORS.TEXT.PRIMARY,
    fontWeight: '500',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeInputWrapper: {
    flex: 1,
    marginRight: 10,
  },
  codeButton: {
    minWidth: 100,
    height: 48,
  },
  errorText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.ERROR,
    marginTop: 6,
    marginLeft: SPACING.XS,
  },

  // Password Eye Toggle
  eyeButton: {
    padding: SPACING.XS,
  },

  // Bottom Area
  forgotPasswordRow: {
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  forgotPasswordText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.PRIMARY_LIGHT,
    fontWeight: '500',
  },
  autoRegisterHint: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUINARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },

  // Login Button
  loginButton: {
    marginTop: SPACING.SM,
    height: 48,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.XXL,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.BORDER.LIGHT,
  },
  dividerText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUINARY,
    marginHorizontal: SPACING.MD,
  },

  // Social Login
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.XXL,
    marginBottom: SPACING.XXL,
  },
  socialButton: {
    alignItems: 'center',
  },
  socialIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.FULL,
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  socialIcon: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: '600',
    color: COLORS.TEXT.TERTIARY,
  },
  socialLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.TEXT.QUATERNARY,
  },

  // Terms
  terms: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.TEXT.QUINARY,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.PRIMARY_LIGHT,
  },
});
