import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii } from '../constants/theme';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Không có kết nối Internet',
  onRetry,
}) => (
  <View style={styles.container}>
    <Text style={styles.icon}>📡</Text>
    <Text style={styles.message}>{message}</Text>
    {onRetry && (
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Thử lại</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  icon: { fontSize: 48, marginBottom: 14 },
  message: { fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 18 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  buttonText: { color: colors.white, fontWeight: '800', fontSize: 13.5 },
});
