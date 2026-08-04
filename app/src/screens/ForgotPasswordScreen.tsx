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
import { colors } from '../constants/theme';
import { forgotPassword, resetPassword } from '../services/api';
import { BackButton } from '../components/BackButton';

export const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [step, setStep] = useState<'phone' | 'reset'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestCode = useCallback(async () => {
    if (!phone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }
    setIsLoading(true);
    try {
      await forgotPassword(phone.trim());
      Alert.alert('Thành công', 'Mã xác nhận đã được gửi đến số điện thoại của bạn');
      setStep('reset');
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  }, [phone]);

  const handleResetPassword = useCallback(async () => {
    if (!code.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã xác nhận và mật khẩu mới');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu nhập lại không khớp');
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword(phone.trim(), code.trim(), password);
      Alert.alert('Thành công', 'Mật khẩu đã được đặt lại', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  }, [phone, code, password, confirmPassword, navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <BackButton onPress={() => navigation.goBack()} />

          <View style={styles.brand}>
            <Text style={styles.brandEmoji}>🔐</Text>
            <Text style={styles.title}>
              {step === 'phone' ? 'Quên mật khẩu' : 'Đặt lại mật khẩu'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'phone'
                ? 'Nhập số điện thoại để nhận mã xác nhận'
                : 'Nhập mã xác nhận và mật khẩu mới'}
            </Text>
          </View>

          <View style={styles.card}>
            {step === 'phone' ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Số điện thoại</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0987654321"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.submitBtn, isLoading && { opacity: 0.6 }]}
                  onPress={handleRequestCode}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.submitText}>Gửi mã xác nhận</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Số điện thoại</Text>
                  <Text style={styles.phoneText}>{phone}</Text>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Mã xác nhận</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Mật khẩu mới</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
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
                <TouchableOpacity
                  style={[styles.submitBtn, isLoading && { opacity: 0.6 }]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.submitText}>Đặt lại mật khẩu</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 },
  brand: { alignItems: 'center', marginBottom: 32 },
  brandEmoji: { fontSize: 48, marginBottom: 8 },
  title: { fontWeight: '800', fontSize: 22, color: colors.navy },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
    gap: 16,
  },
  field: { gap: 4 },
  phoneText: { fontSize: 15, fontWeight: '600', color: colors.navy, paddingVertical: 10 },
  label: { fontSize: 13, fontWeight: '600', color: colors.navy },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 14,
    fontSize: 14,
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
  submitText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
