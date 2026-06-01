/**
 * 登录/注册页面 - 玻璃拟态设计
 * 注册流程：输入账号 → 获取验证码 → 输入6位验证码 → 自动验证 → 输入密码 → 注册
 * 重置密码流程同上
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

type ScreenMode = 'login' | 'register' | 'resetPassword';
type Phase = 'inputIdentifier' | 'inputCode' | 'inputPassword';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^1[3-9]\d{9}$/;
const isEmail = (v: string) => EMAIL_REGEX.test(v);
const isPhone = (v: string) => PHONE_REGEX.test(v);

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

// 6 位验证码独立输入框
const CodeInputBoxes: React.FC<{
  value: string[];
  onChange: (digits: string[]) => void;
  onFilled: (code: string) => void;
  disabled: boolean;
}> = ({ value, onChange, onFilled, disabled }) => {
  const { colors } = useTheme();
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newValue = [...value];
    newValue[index] = digit;
    onChange(newValue);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newValue.join('');
    if (fullCode.length === 6) {
      Keyboard.dismiss();
      onFilled(fullCode);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const boxStyle = useMemo(() => ({
    width: 44, height: 50,
    backgroundColor: colors.OVERLAY.LIGHT,
    borderWidth: 1, borderColor: colors.BORDER.MEDIUM,
    borderRadius: BORDER_RADIUS.MD,
    textAlign: 'center' as const,
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontWeight: '600' as const,
    color: colors.TEXT.PRIMARY,
  }), [colors]);

  return (
    <View style={codeStyles.row}>
      {Array.from({ length: 6 }, (_, i) => (
        <TextInput
          key={i}
          ref={(ref) => { inputRefs.current[i] = ref; }}
          style={boxStyle}
          value={value[i]}
          onChangeText={(text) => handleChange(text, i)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
          keyboardType="number-pad"
          maxLength={1}
          selectionColor={colors.PRIMARY}
          editable={!disabled}
          autoFocus={i === 0}
        />
      ))}
    </View>
  );
};

const codeStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { colors, isDarkMode } = useTheme();

  const [mode, setMode] = useState<ScreenMode>('login');

  // 注册阶段
  const [registerPhase, setRegisterPhase] = useState<Phase>('inputIdentifier');

  // 重置密码阶段
  const [resetPhase, setResetPhase] = useState<Phase>('inputIdentifier');

  // 表单状态
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(6).fill(''));
  const [verifiedCode, setVerifiedCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 重置密码的验证码（独立状态）
  const [resetCodeDigits, setResetCodeDigits] = useState<string[]>(Array(6).fill(''));
  const [resetVerifiedCode, setResetVerifiedCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownEndRef = useRef(0);
  const [countdownActive, setCountdownActive] = useState(false);

  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [codeError, setCodeError] = useState('');

  const ds = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.BACKGROUND },
    glowBlue: { top: -100, left: 50, width: 300, height: 300, backgroundColor: colors.GRADIENT.BLUE, opacity: 0.8 },
    glowPurple: { bottom: -50, right: -50, width: 350, height: 350, backgroundColor: colors.GRADIENT.PURPLE },
    glowPink: { top: '40%', left: '50%', marginLeft: -150, width: 300, height: 300, backgroundColor: colors.GRADIENT.PINK_MID },
    formTitle: { fontSize: TYPOGRAPHY.FONT_SIZE.XXXL, fontWeight: '600', color: colors.TEXT.PRIMARY, marginBottom: SPACING.SM, letterSpacing: -0.5 },
    formSubtitle: { fontSize: TYPOGRAPHY.FONT_SIZE.BASE, color: colors.TEXT.TERTIARY, fontWeight: '400' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.OVERLAY.LIGHT, borderWidth: 1, borderColor: colors.BORDER.MEDIUM, borderRadius: BORDER_RADIUS.LG, paddingHorizontal: SPACING.LG, height: 48 },
    inputError: { borderColor: colors.ERROR_OVERLAY.BORDER, backgroundColor: colors.ERROR_OVERLAY.BACKGROUND },
    input: { flex: 1, fontSize: TYPOGRAPHY.FONT_SIZE.MD, color: colors.TEXT.PRIMARY, fontWeight: '500' },
    errorText: { fontSize: TYPOGRAPHY.FONT_SIZE.SM, color: colors.ERROR, marginTop: 6, marginLeft: SPACING.XS },
    linkText: { fontSize: TYPOGRAPHY.FONT_SIZE.SM, color: colors.PRIMARY_LIGHT, fontWeight: '500' },
    socialIconWrapper: { width: 48, height: 48, borderRadius: BORDER_RADIUS.FULL, backgroundColor: colors.OVERLAY.LIGHT, borderWidth: 1, borderColor: colors.BORDER.MEDIUM, alignItems: 'center', justifyContent: 'center' },
    socialIcon: { fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '600', color: colors.TEXT.TERTIARY },
    terms: { fontSize: TYPOGRAPHY.FONT_SIZE.XS, color: colors.TEXT.QUINARY, textAlign: 'center', lineHeight: 18 },
    termsLink: { color: colors.PRIMARY_LIGHT },
    actionBtn: { marginTop: SPACING.LG, height: 48, borderRadius: BORDER_RADIUS.LG, backgroundColor: colors.PRIMARY, alignItems: 'center', justifyContent: 'center' },
    actionBtnDisabled: { opacity: 0.5 },
    actionBtnText: { fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '600', color: '#ffffff' },
    sendCodeBtn: { marginTop: SPACING.LG, height: 48, borderRadius: BORDER_RADIUS.LG, backgroundColor: colors.OVERLAY.MEDIUM, borderWidth: 1, borderColor: colors.BORDER.MEDIUM, alignItems: 'center', justifyContent: 'center' },
    sendCodeBtnText: { fontSize: TYPOGRAPHY.FONT_SIZE.MD, color: colors.PRIMARY, fontWeight: '500' },
    codeErrorText: { fontSize: TYPOGRAPHY.FONT_SIZE.SM, color: colors.ERROR, marginTop: SPACING.SM, textAlign: 'center' as const },
    phaseHint: { fontSize: TYPOGRAPHY.FONT_SIZE.SM, color: colors.TEXT.QUATERNARY, textAlign: 'center' as const, marginTop: SPACING.SM },
  }), [colors]);

  // 倒计时
  useEffect(() => {
    if (!countdownActive) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((countdownEndRef.current - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining > 0) { countdownRef.current = setTimeout(tick, 1000); }
      else { countdownEndRef.current = 0; setCountdownActive(false); }
    };
    tick();
    return () => { if (countdownRef.current) clearTimeout(countdownRef.current); };
  }, [countdownActive]);

  const validateIdentifier = (v: string) => {
    if (!v) { setIdentifierError('请输入邮箱或手机号'); return false; }
    if (!isEmail(v) && !isPhone(v)) { setIdentifierError('请输入正确的邮箱或手机号'); return false; }
    setIdentifierError(''); return true;
  };

  const startCountdown = () => { setCountdown(60); countdownEndRef.current = Date.now() + 60 * 1000; setCountdownActive(true); };

  // 发送验证码（注册 + 重置密码共用）
  const handleSendCode = useCallback(async (onSuccess: () => void) => {
    if (!validateIdentifier(identifier)) return;
    Keyboard.dismiss();
    const purpose = mode === 'register' ? 'register' as const : 'resetPassword' as const;
    try {
      setSendingCode(true);
      await authService.sendVerificationCode(identifier, purpose);
      startCountdown();
      onSuccess();
      Toast.show('验证码已发送');
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      if (msg) { Toast.show(msg); }
      else { Toast.show('验证码发送失败，请稍后重试'); }
    }
    finally { setSendingCode(false); }
  }, [identifier, mode]);

  // 验证码自动校验（注册 + 重置密码共用）
  const handleCodeFilled = useCallback(async (code: string) => {
    const isRegister = mode === 'register';
    setCodeError(''); setVerifying(true);
    try {
      await authService.verifyCode(identifier, code);
      if (isRegister) { setVerifiedCode(code); setRegisterPhase('inputPassword'); }
      else { setResetVerifiedCode(code); setResetPhase('inputPassword'); }
    } catch {
      setCodeError('验证码错误，请重新输入');
      if (isRegister) { setCodeDigits(Array(6).fill('')); }
      else { setResetCodeDigits(Array(6).fill('')); }
    }
    finally { setVerifying(false); }
  }, [identifier, mode]);

  const handleRegister = async () => {
    setPasswordError('');
    if (!password) { setPasswordError('请输入密码'); return; }
    if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(password) || password.length < 6) {
      setPasswordError('密码需包含字母和数字，6-72位'); return;
    }
    try {
      setLoading(true);
      const response = await authService.register(identifier, verifiedCode, password);
      await saveToken(response.token);
      if (response.refreshToken) await saveRefreshToken(response.refreshToken);
      await storageService.saveUser(response.user);
      Toast.show('注册成功');
      onLoginSuccess();
    } catch (e: any) { Dialog.show('注册失败', e?.response?.data?.error || '注册失败'); }
    finally { setLoading(false); }
  };

  const handleLogin = async () => {
    setIdentifierError(''); setPasswordError('');
    if (!validateIdentifier(identifier)) return;
    if (!password) { setPasswordError('请输入密码'); return; }
    try {
      setLoading(true);
      const response = await authService.loginWithPassword(identifier, password);
      await saveToken(response.token);
      if (response.refreshToken) await saveRefreshToken(response.refreshToken);
      await storageService.saveUser(response.user);
      onLoginSuccess();
    } catch { Dialog.show('登录失败', '账号或密码错误'); }
    finally { setLoading(false); }
  };

  const handleResetSubmit = async () => {
    setPasswordError('');
    if (!password) { setPasswordError('请输入新密码'); return; }
    if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(password) || password.length < 6) {
      setPasswordError('密码需包含字母和数字，6-72位'); return;
    }
    try {
      setLoading(true);
      await authService.resetPassword(identifier, resetVerifiedCode, password);
      Toast.show('密码重置成功，请使用新密码登录');
      setMode('login'); setPassword(''); setResetPhase('inputIdentifier');
      setResetCodeDigits(Array(6).fill('')); setResetVerifiedCode('');
    } catch { Toast.show('重置失败，请检查验证码'); }
    finally { setLoading(false); }
  };

  const switchMode = (m: ScreenMode) => {
    setMode(m); setCodeDigits(Array(6).fill('')); setVerifiedCode('');
    setResetCodeDigits(Array(6).fill('')); setResetVerifiedCode('');
    setPassword(''); setIdentifierError(''); setPasswordError(''); setCodeError('');
    setRegisterPhase('inputIdentifier'); setResetPhase('inputIdentifier');
  };

  const getTitle = () => mode === 'register' ? '注册' : mode === 'resetPassword' ? '重置密码' : '登录';
  const getSubtitle = () => mode === 'register' ? '创建账号，开始你的户外探索' : mode === 'resetPassword' ? '通过验证码重置你的密码' : '欢迎回来，继续你的户外探索';

  // 根据模式决定顶部间距：登录居中，注册/重置偏上
  const scrollAlignment = mode === 'login' ? 'center' as const : 'flex-start' as const;
  const scrollPaddingTop = mode === 'login' ? 20 : 80;

  return (
    <View style={ds.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.BACKGROUND} />
      <View style={s.backgroundGlow}>
        <View style={[s.glowCircle, ds.glowBlue]} />
        <View style={[s.glowCircle, ds.glowPurple]} />
        <View style={[s.glowCircle, ds.glowPink]} />
      </View>
      <FullScreenBlur />

      <KeyboardAvoidingView style={s.keyboardView}>
        <ScrollView contentContainerStyle={[s.scrollContent, { justifyContent: scrollAlignment, paddingTop: scrollPaddingTop }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.cardContainer}>
            <View style={s.formContainer}>
              <View style={s.formHeader}>
                <Text style={ds.formTitle}>{getTitle()}</Text>
                <Text style={ds.formSubtitle}>{getSubtitle()}</Text>
              </View>

              {/* ====== 登录 ====== */}
              {mode === 'login' && (
                <View style={s.formFields}>
                  <View style={s.inputContainer}>
                    <View style={[ds.inputWrapper, identifierError && ds.inputError]}>
                      <TextInput style={ds.input} value={identifier} onChangeText={(v) => { setIdentifier(v); setIdentifierError(''); }}
                        placeholder="邮箱 / 手机号" placeholderTextColor={colors.TEXT.PLACEHOLDER}
                        keyboardType="email-address" autoCapitalize="none" selectionColor={colors.PRIMARY} />
                    </View>
                    {identifierError ? <Text style={ds.errorText}>{identifierError}</Text> : null}
                  </View>
                  <View style={s.inputContainer}>
                    <View style={[ds.inputWrapper, passwordError && ds.inputError]}>
                      <TextInput style={ds.input} value={password} onChangeText={(v) => { setPassword(v); setPasswordError(''); }}
                        placeholder="请输入密码" placeholderTextColor={colors.TEXT.PLACEHOLDER}
                        secureTextEntry={!showPassword} maxLength={72} selectionColor={colors.PRIMARY} />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeButton} activeOpacity={0.7}>
                        {showPassword ? <IconEyeScan size={20} color={colors.TEXT.TERTIARY} /> : <IconEyeClosed size={20} color={colors.TEXT.TERTIARY} />}
                      </TouchableOpacity>
                    </View>
                    {passwordError ? <Text style={ds.errorText}>{passwordError}</Text> : null}
                  </View>
                  <Button title="登录" onPress={handleLogin} loading={loading} disabled={loading} style={s.actionBtnStyle} />
                  <View style={s.bottomLinks}>
                    <TouchableOpacity onPress={() => switchMode('resetPassword')} activeOpacity={0.7}><Text style={ds.linkText}>忘记密码</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => switchMode('register')} activeOpacity={0.7}><Text style={ds.linkText}>注册新账号</Text></TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ====== 注册 ====== */}
              {mode === 'register' && (
                <View style={s.formFields}>
                  <View style={s.inputContainer}>
                    <View style={[ds.inputWrapper, identifierError && ds.inputError]}>
                      <TextInput style={ds.input} value={identifier} onChangeText={(v) => { setIdentifier(v); setIdentifierError(''); }}
                        placeholder="请输入邮箱或手机号" placeholderTextColor={colors.TEXT.PLACEHOLDER}
                        keyboardType="email-address" autoCapitalize="none" editable={registerPhase === 'inputIdentifier'} selectionColor={colors.PRIMARY} />
                    </View>
                    {identifierError ? <Text style={ds.errorText}>{identifierError}</Text> : null}
                  </View>

                  {registerPhase === 'inputCode' && (
                    <View style={s.inputContainer}>
                      <CodeInputBoxes value={codeDigits} onChange={setCodeDigits} onFilled={handleCodeFilled} disabled={verifying} />
                      {codeError ? <Text style={ds.codeErrorText}>{codeError}</Text> : null}
                      {verifying && <Text style={ds.phaseHint}>验证中...</Text>}
                    </View>
                  )}

                  {registerPhase === 'inputPassword' && (
                    <View style={s.inputContainer}>
                      <View style={[ds.inputWrapper, passwordError && ds.inputError]}>
                        <TextInput style={ds.input} value={password} onChangeText={(v) => { setPassword(v); setPasswordError(''); }}
                          placeholder="请设置密码（需包含字母和数字，6-72位）" placeholderTextColor={colors.TEXT.PLACEHOLDER}
                          secureTextEntry={!showPassword} maxLength={72} selectionColor={colors.PRIMARY} autoFocus />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeButton} activeOpacity={0.7}>
                          {showPassword ? <IconEyeScan size={20} color={colors.TEXT.TERTIARY} /> : <IconEyeClosed size={20} color={colors.TEXT.TERTIARY} />}
                        </TouchableOpacity>
                      </View>
                      {passwordError ? <Text style={ds.errorText}>{passwordError}</Text> : null}
                    </View>
                  )}

                  {registerPhase === 'inputIdentifier' && (
                    <TouchableOpacity style={[ds.actionBtn, (sendingCode || countdown > 0) && ds.actionBtnDisabled]}
                      onPress={() => handleSendCode(() => setRegisterPhase('inputCode'))} disabled={sendingCode || countdown > 0} activeOpacity={0.7}>
                      <Text style={ds.actionBtnText}>{sendingCode ? '发送中...' : '获取验证码'}</Text>
                    </TouchableOpacity>
                  )}
                  {registerPhase === 'inputCode' && (
                    <TouchableOpacity style={[ds.sendCodeBtn, (countdown > 0 || sendingCode) && ds.actionBtnDisabled]}
                      onPress={() => handleSendCode(() => {})} disabled={countdown > 0 || sendingCode} activeOpacity={0.7}>
                      <Text style={ds.sendCodeBtnText}>{countdown > 0 ? `重新发送 (${countdown}s)` : sendingCode ? '发送中...' : '重新发送'}</Text>
                    </TouchableOpacity>
                  )}
                  {registerPhase === 'inputPassword' && (
                    <TouchableOpacity style={[ds.actionBtn, loading && ds.actionBtnDisabled]}
                      onPress={handleRegister} disabled={loading} activeOpacity={0.7}>
                      <Text style={ds.actionBtnText}>{loading ? '注册中...' : '注册'}</Text>
                    </TouchableOpacity>
                  )}

                  <View style={s.bottomLinks}>
                    <TouchableOpacity onPress={() => switchMode('login')} activeOpacity={0.7}>
                      <Text style={ds.linkText}>已有账号？去登录</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ====== 重置密码（跟注册一样的渐进式流程） ====== */}
              {mode === 'resetPassword' && (
                <View style={s.formFields}>
                  <View style={s.inputContainer}>
                    <View style={[ds.inputWrapper, identifierError && ds.inputError]}>
                      <TextInput style={ds.input} value={identifier} onChangeText={(v) => { setIdentifier(v); setIdentifierError(''); }}
                        placeholder="请输入邮箱或手机号" placeholderTextColor={colors.TEXT.PLACEHOLDER}
                        keyboardType="email-address" autoCapitalize="none" editable={resetPhase === 'inputIdentifier'} selectionColor={colors.PRIMARY} />
                    </View>
                    {identifierError ? <Text style={ds.errorText}>{identifierError}</Text> : null}
                  </View>

                  {resetPhase === 'inputCode' && (
                    <View style={s.inputContainer}>
                      <CodeInputBoxes value={resetCodeDigits} onChange={setResetCodeDigits} onFilled={handleCodeFilled} disabled={verifying} />
                      {codeError ? <Text style={ds.codeErrorText}>{codeError}</Text> : null}
                      {verifying && <Text style={ds.phaseHint}>验证中...</Text>}
                    </View>
                  )}

                  {resetPhase === 'inputPassword' && (
                    <View style={s.inputContainer}>
                      <View style={[ds.inputWrapper, passwordError && ds.inputError]}>
                        <TextInput style={ds.input} value={password} onChangeText={(v) => { setPassword(v); setPasswordError(''); }}
                          placeholder="请输入新密码（需包含字母和数字，6-72位）" placeholderTextColor={colors.TEXT.PLACEHOLDER}
                          secureTextEntry={!showPassword} maxLength={72} selectionColor={colors.PRIMARY} autoFocus />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeButton} activeOpacity={0.7}>
                          {showPassword ? <IconEyeScan size={20} color={colors.TEXT.TERTIARY} /> : <IconEyeClosed size={20} color={colors.TEXT.TERTIARY} />}
                        </TouchableOpacity>
                      </View>
                      {passwordError ? <Text style={ds.errorText}>{passwordError}</Text> : null}
                    </View>
                  )}

                  {resetPhase === 'inputIdentifier' && (
                    <TouchableOpacity style={[ds.actionBtn, (sendingCode || countdown > 0) && ds.actionBtnDisabled]}
                      onPress={() => handleSendCode(() => setResetPhase('inputCode'))} disabled={sendingCode || countdown > 0} activeOpacity={0.7}>
                      <Text style={ds.actionBtnText}>{sendingCode ? '发送中...' : '获取验证码'}</Text>
                    </TouchableOpacity>
                  )}
                  {resetPhase === 'inputCode' && (
                    <TouchableOpacity style={[ds.sendCodeBtn, (countdown > 0 || sendingCode) && ds.actionBtnDisabled]}
                      onPress={() => handleSendCode(() => {})} disabled={countdown > 0 || sendingCode} activeOpacity={0.7}>
                      <Text style={ds.sendCodeBtnText}>{countdown > 0 ? `重新发送 (${countdown}s)` : sendingCode ? '发送中...' : '重新发送'}</Text>
                    </TouchableOpacity>
                  )}
                  {resetPhase === 'inputPassword' && (
                    <TouchableOpacity style={[ds.actionBtn, loading && ds.actionBtnDisabled]}
                      onPress={handleResetSubmit} disabled={loading} activeOpacity={0.7}>
                      <Text style={ds.actionBtnText}>{loading ? '重置中...' : '重置密码'}</Text>
                    </TouchableOpacity>
                  )}

                  <View style={s.bottomLinks}>
                    <TouchableOpacity onPress={() => switchMode('login')} activeOpacity={0.7}>
                      <Text style={ds.linkText}>返回登录</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Social Login & Terms */}
              {mode === 'login' && (
                <>
                  <View style={s.socialContainer}>
                    <TouchableOpacity style={s.socialButton} activeOpacity={0.7}>
                      <View style={ds.socialIconWrapper}><Text style={ds.socialIcon}>W</Text></View>
                    </TouchableOpacity>
                  </View>
                  <Text style={ds.terms}>
                    登录即表示同意 <Text style={ds.termsLink}>用户协议</Text> 和 <Text style={ds.termsLink}>隐私政策</Text>
                  </Text>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  backgroundGlow: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: 0 },
  glowCircle: { position: 'absolute', borderRadius: BORDER_RADIUS.FULL },
  keyboardView: { flex: 1, zIndex: 2 },
  scrollContent: { flexGrow: 1, paddingHorizontal: SPACING.XXL },
  cardContainer: { maxWidth: 380, width: '100%', alignSelf: 'center' },
  formContainer: { paddingHorizontal: SPACING.XXL, paddingVertical: SPACING.XXL },
  formHeader: { alignItems: 'center', marginBottom: 28 },
  formFields: { marginBottom: SPACING.XS },
  inputContainer: { marginBottom: SPACING.LG },
  eyeButton: { padding: SPACING.XS },
  actionBtnStyle: { marginTop: SPACING.SM, height: 48 },
  bottomLinks: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.LG },
  socialContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.XXL, marginBottom: SPACING.XXL },
  socialButton: { alignItems: 'center' },
});
