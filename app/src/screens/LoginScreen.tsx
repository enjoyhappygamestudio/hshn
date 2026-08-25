import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, commonStyles } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';

export const LoginScreen: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { login, register, isLoading } = useAuthStore();

  const handleSubmit = useCallback(async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại và mật khẩu');
      return;
    }
    if (mode === 'register') {
      if (!name.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập họ tên');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Lỗi', 'Mật khẩu nhập lại không khớp');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
        return;
      }
    }

    try {
      if (mode === 'login') {
        await login(phone.trim(), password);
      } else {
        await register(name.trim(), phone.trim(), password, email.trim() || undefined);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Có lỗi xảy ra');
    }
  }, [mode, name, email, phone, password, confirmPassword, login, register]);

  return (
    <SafeAreaView style={commonStyles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Text style={styles.brandEmoji}>🦐</Text>
            <Text style={styles.brandName}>
              HẢI SẢN <Text style={styles.brandDot}>HÀ NỘI</Text>
            </Text>
            <Text style={styles.brandSub}>MEH Seafood</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => setMode('login')}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                  Đăng nhập
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'register' && styles.tabActive]}
                onPress={() => setMode('register')}
              >
                <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                  Đăng ký
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {mode === 'register' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Họ tên</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nguyễn Văn A"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              {mode === 'register' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="email@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>Số điện thoại</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0987654321"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Mật khẩu</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              {mode === 'register' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Nhập lại mật khẩu</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
              )}

              {mode === 'login' && (
                <TouchableOpacity
                  onPress={() => (useNavigation() as any).navigate('ForgotPassword')}
                  style={{ alignItems: 'flex-end', marginTop: -8 }}
                >
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>
                    Quên mật khẩu?
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  brandName: {
    fontWeight: '800',
    fontSize: 22,
    color: colors.navy,
  },
  brandDot: {
    color: colors.coral,
  },
  brandSub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  form: {
    padding: 20,
    gap: 16,
  },
  field: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: fonts.numeric,
    color: colors.navy,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
