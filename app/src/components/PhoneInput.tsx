/**
 * 手机号输入组件
 * 支持格式化和校验
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  style?: ViewStyle;
  placeholder?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChangeText,
  error,
  style,
  placeholder = '请输入手机号',
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const formatPhoneNumber = (text: string): string => {
    // 移除非数字字符
    const cleaned = text.replace(/\D/g, '');
    // 限制11位
    return cleaned.slice(0, 11);
  };

  const handleChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    onChangeText(formatted);
  };

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        <Text style={styles.prefix}>+86</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          keyboardType="phone-pad"
          maxLength={11}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectionColor="#3b82f6"
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    height: 56,
  },
  inputFocused: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputError: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  prefix: {
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
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 8,
    marginLeft: 4,
  },
});
