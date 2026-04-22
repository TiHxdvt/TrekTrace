/**
 * 登录页面 - 玻璃拟态设计
 * 支持验证码登录和密码登录两种模式
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { Toast } from '../components/Toast';
import { FullScreenBlur } from '../components/FullScreenBlur';
import { IconEyeClosed, IconEyeScan } from '../components/SolarIcons';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
import { saveToken, saveRefreshToken } from '../services/api';
import { BORDER_RADIUS, TYPOGRAPHY, SPACING } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

type LoginMode = 'sms' | 'password';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { colors, isDarkMode } = useTheme();

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
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownEndRef = useRef(0); // 倒计时结束的绝对时间戳

  // 错误状态
  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [accountError, setAccountError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // 忘记密码弹窗状态
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPwd, setResetNewPwd] = useState('');
  const [resetConfirmPwd, setResetConfirmPwd] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(0);
  const resetCountdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetCountdownEndRef = useRef(0);
  const [resetCountdownActive, setResetCountdownActive] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.BACKGROUND,
    },
    glowBlue: {
      top: -100,
      left: 50,
      width: 300,
      height: 300,
      backgroundColor: colors.GRADIENT.BLUE,
      opacity: 0.8,
    },
    glowPurple: {
      bottom: -50,
      right: -50,
      width: 350,
      height: 350,
      backgroundColor: colors.GRADIENT.PURPLE,
    },
    glowPink: {
      top: '40%',
      left: '50%',
      marginLeft: -150,
      width: 300,
      height: 300,
      backgroundColor: colors.GRADIENT.PINK_MID,
    },
    formTitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.XXXL,
      fontWeight: '600',
      color: colors.TEXT.PRIMARY,
      marginBottom: SPACING.SM,
      letterSpacing: -0.5,
    },
    formSubtitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
      color: colors.TEXT.TERTIARY,
      fontWeight: '400',
    },
    switchModeText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
    },
    switchModeLink: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.PRIMARY,
      fontWeight: '600',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
      borderRadius: BORDER_RADIUS.LG,
      paddingHorizontal: SPACING.LG,
      height: 48,
    },
    inputError: {
      borderColor: colors.ERROR_OVERLAY.BORDER,
      backgroundColor: colors.ERROR_OVERLAY.BACKGROUND,
    },
    inputPrefix: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.TERTIARY,
      fontWeight: '500',
    },
    inputDivider: {
      width: 1,
      height: 20,
      backgroundColor: colors.BORDER.MEDIUM,
      marginHorizontal: SPACING.MD,
    },
    input: {
      flex: 1,
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.PRIMARY,
      fontWeight: '500',
    },
    errorText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.ERROR,
      marginTop: 6,
      marginLeft: SPACING.XS,
    },
    forgotPasswordText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.PRIMARY_LIGHT,
      fontWeight: '500',
    },
    autoRegisterHint: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUINARY,
      textAlign: 'center',
      marginBottom: SPACING.LG,
    },
    socialIconWrapper: {
      width: 48,
      height: 48,
      borderRadius: BORDER_RADIUS.FULL,
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
      alignItems: 'center',
      justifyContent: 'center',
    },
    socialIcon: {
      fontSize: TYPOGRAPHY.FONT_SIZE.LG,
      fontWeight: '600',
      color: colors.TEXT.TERTIARY,
    },
    terms: {
      fontSize: TYPOGRAPHY.FONT_SIZE.XS,
      color: colors.TEXT.QUINARY,
      textAlign: 'center',
      lineHeight: 18,
    },
    termsLink: {
      color: colors.PRIMARY_LIGHT,
    },
    resetModalOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.XXL,
    },
    resetModalCard: {
      backgroundColor: colors.BACKGROUND,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      borderRadius: BORDER_RADIUS.XL,
      padding: SPACING.XXL,
      width: '100%',
      maxWidth: 380,
      gap: SPACING.MD,
    },
    resetModalTitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.LG,
      fontWeight: '600',
      color: colors.TEXT.PRIMARY,
      textAlign: 'center',
      marginBottom: SPACING.SM,
    },
    resetModalInput: {
      backgroundColor: colors.OVERLAY.MEDIUM,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
      borderRadius: BORDER_RADIUS.MD,
      paddingHorizontal: SPACING.LG,
      paddingVertical: SPACING.MD,
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.PRIMARY,
    },
    resetModalBtnCancel: {
      backgroundColor: colors.OVERLAY.MEDIUM,
    },
    resetModalBtnCancelText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      color: colors.TEXT.TERTIARY,
    },
    resetModalBtnConfirm: {
      backgroundColor: colors.PRIMARY,
    },
    resetModalBtnConfirmText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      fontWeight: '600',
      color: '#ffffff',
    },
    btnDisabled: { opacity: 0.5 },
  }), [colors]);

  // 倒计时逻辑 — 基于绝对时间戳，后台回来也能正确显示剩余时间
  const [countdownActive, setCountdownActive] = useState(false);

  useEffect(() => {
    if (!countdownActive) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((countdownEndRef.current - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining > 0) {
        countdownRef.current = setTimeout(tick, 1000);
      } else {
        countdownEndRef.current = 0;
        setCountdownActive(false);
      }
    };

    tick();
    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [countdownActive]);

  // 重置密码倒计时逻辑
  useEffect(() => {
    if (!resetCountdownActive) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((resetCountdownEndRef.current - Date.now()) / 1000));
      setResetCountdown(remaining);
      if (remaining > 0) {
        resetCountdownRef.current = setTimeout(tick, 1000);
      } else {
        resetCountdownEndRef.current = 0;
        setResetCountdownActive(false);
      }
    };

    tick();
    return () => {
      if (resetCountdownRef.current) {
        clearTimeout(resetCountdownRef.current);
      }
    };
  }, [resetCountdownActive]);

  // 打开重置密码弹窗
  const handleOpenReset = () => {
    setResetPhone(loginMode === 'sms' ? phone : account);
    setResetCode('');
    setResetNewPwd('');
    setResetConfirmPwd('');
    setResetStep(1);
    setShowResetModal(true);
  };

  // 重置密码发送验证码
  const handleResetSendCode = async () => {
    if (!resetPhone || !validatePhone(resetPhone)) {
      Toast.show('请输入正确的手机号');
      return;
    }
    try {
      setResetSending(true);
      await authService.sendVerificationCode(resetPhone);
      setResetCountdown(60);
      resetCountdownEndRef.current = Date.now() + 60 * 1000;
      setResetCountdownActive(true);
      setResetStep(2);
      Toast.show('验证码已发送');
    } catch {
      Toast.show('验证码发送失败');
    } finally {
      setResetSending(false);
    }
  };

  // 提交重置密码
  const handleResetSubmit = async () => {
    if (!resetCode || resetCode.length !== 6) {
      Toast.show('请输入6位验证码');
      return;
    }
    if (!resetNewPwd || resetNewPwd.length < 6) {
      Toast.show('密码至少6位');
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(resetNewPwd)) {
      Toast.show('密码需包含字母和数字');
      return;
    }
    if (resetNewPwd !== resetConfirmPwd) {
      Toast.show('两次密码不一致');
      return;
    }
    try {
      setResetLoading(true);
      await authService.resetPassword(resetPhone, resetCode, resetNewPwd);
      Toast.show('密码重置成功，请使用新密码登录');
      setShowResetModal(false);
      setLoginMode('password');
      setAccount(resetPhone);
    } catch {
      Toast.show('重置失败，请检查验证码');
    } finally {
      setResetLoading(false);
    }
  };

  // 切换模式时保留手机号，清空其他字段和错误
  const handleSwitchMode = (mode: LoginMode) => {
    const currentPhone = loginMode === 'sms' ? phone : account;
    setLoginMode(mode);
    setPhoneError('');
    setCodeError('');
    setAccountError('');
    setPasswordError('');
    if (mode === 'sms') {
      setPhone(currentPhone);
      setCode('');
      setPassword('');
    } else {
      setAccount(currentPhone);
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

    Keyboard.dismiss();

    try {
      setSendingCode(true);
      await authService.sendVerificationCode(phone);

      setCountdown(60);
      countdownEndRef.current = Date.now() + 60 * 1000;
      setCountdownActive(true);

      Toast.show('验证码已发送');
    } catch (error: any) {
      console.error('Send code error:', error);
      Toast.show('验证码发送失败，请稍后重试');
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

      await saveToken(response.token);
      if (response.refreshToken) {
        await saveRefreshToken(response.refreshToken);
      }
      await storageService.saveUser(response.user);

      onLoginSuccess();
    } catch (error: any) {
      console.error('Login error:', error);
      Dialog.show('登录失败', '验证码错误或已过期，请重新获取');
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

      await saveToken(response.token);
      if (response.refreshToken) {
        await saveRefreshToken(response.refreshToken);
      }
      await storageService.saveUser(response.user);

      onLoginSuccess();
    } catch (error: any) {
      console.error('Password login error:', error);
      Dialog.show('登录失败', '账号或密码错误');
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
    <View style={dynamicStyles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.BACKGROUND} />

      {/* Background Glow Effects */}
      <View style={styles.backgroundGlow}>
        <View style={[styles.glowCircle, dynamicStyles.glowBlue]} />
        <View style={[styles.glowCircle, dynamicStyles.glowPurple]} />
        <View style={[styles.glowCircle, dynamicStyles.glowPink]} />
      </View>

      {/* 全屏模糊层 */}
      <FullScreenBlur />

      <KeyboardAvoidingView
        style={styles.keyboardView}
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
                <Text style={dynamicStyles.formTitle}>登录</Text>
                <Text style={dynamicStyles.formSubtitle}>欢迎回来，继续你的户外探索</Text>
              </View>

              {/* SMS Login Form */}
              {loginMode === 'sms' && (
                <View style={styles.formFields}>
                  {/* Phone Input */}
                  <View style={styles.inputContainer}>
                    <View style={[dynamicStyles.inputWrapper, phoneError && dynamicStyles.inputError]}>
                      <Text style={dynamicStyles.inputPrefix}>+86</Text>
                      <View style={dynamicStyles.inputDivider} />
                      <TextInput
                        style={dynamicStyles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="请输入手机号"
                        placeholderTextColor={colors.TEXT.PLACEHOLDER}
                        keyboardType="phone-pad"
                        maxLength={11}
                        selectionColor={colors.PRIMARY}
                      />
                    </View>
                    {phoneError ? <Text style={dynamicStyles.errorText}>{phoneError}</Text> : null}
                  </View>

                  {/* Code Input */}
                  <View style={styles.inputContainer}>
                    <View style={styles.codeRow}>
                      <View style={[dynamicStyles.inputWrapper, styles.codeInputWrapper, codeError && dynamicStyles.inputError]}>
                        <TextInput
                          style={dynamicStyles.input}
                          value={code}
                          onChangeText={setCode}
                          placeholder="请输入验证码"
                          placeholderTextColor={colors.TEXT.PLACEHOLDER}
                          keyboardType="number-pad"
                          maxLength={6}
                          selectionColor={colors.PRIMARY}
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
                    {codeError ? <Text style={dynamicStyles.errorText}>{codeError}</Text> : null}
                  </View>
                </View>
              )}

              {/* Password Login Form */}
              {loginMode === 'password' && (
                <View style={styles.formFields}>
                  {/* Account Input */}
                  <View style={styles.inputContainer}>
                    <View style={[dynamicStyles.inputWrapper, accountError && dynamicStyles.inputError]}>
                      <Text style={dynamicStyles.inputPrefix}>+86</Text>
                      <View style={dynamicStyles.inputDivider} />
                      <TextInput
                        style={dynamicStyles.input}
                        value={account}
                        onChangeText={setAccount}
                        placeholder="请输入手机号"
                        placeholderTextColor={colors.TEXT.PLACEHOLDER}
                        keyboardType="phone-pad"
                        maxLength={11}
                        selectionColor={colors.PRIMARY}
                      />
                    </View>
                    {accountError ? <Text style={dynamicStyles.errorText}>{accountError}</Text> : null}
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputContainer}>
                    <View style={[dynamicStyles.inputWrapper, passwordError && dynamicStyles.inputError]}>
                      <TextInput
                        style={dynamicStyles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="请输入密码"
                        placeholderTextColor={colors.TEXT.PLACEHOLDER}
                        secureTextEntry={!showPassword}
                        selectionColor={colors.PRIMARY}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}
                        activeOpacity={0.7}
                      >
                        {showPassword ? (
                          <IconEyeScan size={20} color={colors.TEXT.TERTIARY} />
                        ) : (
                          <IconEyeClosed size={20} color={colors.TEXT.TERTIARY} />
                        )}
                      </TouchableOpacity>
                    </View>
                    {passwordError ? <Text style={dynamicStyles.errorText}>{passwordError}</Text> : null}
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
                  <Text style={dynamicStyles.switchModeText}>
                    {loginMode === 'sms' ? '账号密码登录' : '验证码登录'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleSwitchMode(loginMode === 'sms' ? 'password' : 'sms')}
                    activeOpacity={0.7}
                  >
                    <Text style={dynamicStyles.switchModeLink}>切换</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleOpenReset}
                    activeOpacity={0.7}
                    style={styles.forgotPasswordLink}
                  >
                    <Text style={dynamicStyles.forgotPasswordText}>忘记密码</Text>
                  </TouchableOpacity>
                </View>

                {/* Social Login */}
                {/* TODO: 接入微信/Apple 等第三方登录 */}
                <View style={styles.socialContainer}>
                  <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                    <View style={dynamicStyles.socialIconWrapper}>
                      <Text style={dynamicStyles.socialIcon}>W</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <Text style={dynamicStyles.autoRegisterHint}>
                  未注册手机号将自动创建账号
                </Text>

                {/* Terms */}
                {/* TODO: 接入用户协议和隐私政策页面 */}
                <Text style={dynamicStyles.terms}>
                  登录即表示同意{' '}
                  <Text style={dynamicStyles.termsLink}>用户协议</Text>
                  {' '}和{' '}
                  <Text style={dynamicStyles.termsLink}>隐私政策</Text>
                </Text>
              </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 重置密码弹窗 */}
      {showResetModal && (
        <View style={dynamicStyles.resetModalOverlay}>
          <View style={dynamicStyles.resetModalCard}>
            <Text style={dynamicStyles.resetModalTitle}>重置密码</Text>

            {/* Step 1: 输入手机号 */}
            {resetStep === 1 && (
              <>
                <TextInput
                  style={dynamicStyles.resetModalInput}
                  value={resetPhone}
                  onChangeText={setResetPhone}
                  placeholder="请输入手机号"
                  placeholderTextColor={colors.TEXT.PLACEHOLDER}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
                <View style={styles.resetModalBtnRow}>
                  <TouchableOpacity style={[styles.resetModalBtn, dynamicStyles.resetModalBtnCancel]} onPress={() => setShowResetModal(false)}>
                    <Text style={dynamicStyles.resetModalBtnCancelText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.resetModalBtn, dynamicStyles.resetModalBtnConfirm]} onPress={handleResetSendCode} disabled={resetSending}>
                    <Text style={dynamicStyles.resetModalBtnConfirmText}>{resetSending ? '发送中...' : '发送验证码'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Step 2: 输入验证码 + 新密码 */}
            {resetStep === 2 && (
              <>
                <TextInput
                  style={dynamicStyles.resetModalInput}
                  value={resetCode}
                  onChangeText={setResetCode}
                  placeholder="请输入验证码"
                  placeholderTextColor={colors.TEXT.PLACEHOLDER}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TextInput
                  style={dynamicStyles.resetModalInput}
                  value={resetNewPwd}
                  onChangeText={setResetNewPwd}
                  placeholder="新密码（需包含字母和数字，6-72位）"
                  placeholderTextColor={colors.TEXT.PLACEHOLDER}
                  secureTextEntry
                  maxLength={72}
                />
                <TextInput
                  style={dynamicStyles.resetModalInput}
                  value={resetConfirmPwd}
                  onChangeText={setResetConfirmPwd}
                  placeholder="确认新密码"
                  placeholderTextColor={colors.TEXT.PLACEHOLDER}
                  secureTextEntry
                  maxLength={72}
                />
                <View style={styles.resetModalBtnRow}>
                  <TouchableOpacity style={[styles.resetModalBtn, dynamicStyles.resetModalBtnCancel]} onPress={() => setShowResetModal(false)}>
                    <Text style={dynamicStyles.resetModalBtnCancelText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.resetModalBtn, dynamicStyles.resetModalBtnConfirm, resetLoading && dynamicStyles.btnDisabled]} onPress={handleResetSubmit} disabled={resetLoading}>
                    <Text style={dynamicStyles.resetModalBtnConfirmText}>{resetLoading ? '重置中...' : '确认重置'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: BORDER_RADIUS.FULL,
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

  // Form Fields
  formFields: {
    marginBottom: SPACING.XS,
  },
  inputContainer: {
    marginBottom: SPACING.LG,
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

  // Password Eye Toggle
  eyeButton: {
    padding: SPACING.XS,
  },

  // Bottom Area
  forgotPasswordLink: {
    marginLeft: 'auto',
  },

  // Login Button
  loginButton: {
    marginTop: SPACING.SM,
    height: 48,
  },

  // Social Login
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.XXL,
    marginBottom: SPACING.XXL,
  },
  socialButton: {
    alignItems: 'center',
  },

  // Switch Mode Row
  switchModeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.LG,
    gap: SPACING.XS,
  },

  // Reset Password Modal
  resetModalBtnRow: {
    flexDirection: 'row',
    gap: SPACING.MD,
    marginTop: SPACING.SM,
  },
  resetModalBtn: {
    flex: 1,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
  },
});
