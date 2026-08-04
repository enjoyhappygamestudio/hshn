import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii } from '../constants/theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '🛒',
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <View style={styles.container}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.title}>{title}</Text>
    {description && <Text style={styles.desc}>{description}</Text>}
    {actionLabel && onAction && (
      <TouchableOpacity style={styles.button} onPress={onAction}>
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  icon: { fontSize: 56, marginBottom: 14, opacity: 0.5 },
  title: { fontSize: 15, fontWeight: '700', color: colors.navy, marginBottom: 6 },
  desc: { fontSize: 12.5, color: colors.muted, marginBottom: 18, textAlign: 'center' },
  button: {
    backgroundColor: colors.coral,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  buttonText: { color: colors.white, fontWeight: '800', fontSize: 13.5 },
});
