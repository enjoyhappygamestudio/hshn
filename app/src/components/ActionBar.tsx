import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, radii } from '../constants/theme';

interface ActionBarProps {
  primaryLabel: string;
  primaryAction: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  secondaryAction?: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  primaryLabel,
  primaryAction,
  primaryLoading = false,
  primaryDisabled = false,
  secondaryLabel,
  secondaryAction,
}) => (
  <View style={styles.container}>
    {secondaryLabel && secondaryAction && (
      <TouchableOpacity style={styles.secondaryBtn} onPress={secondaryAction}>
        <Text style={styles.secondaryText}>{secondaryLabel}</Text>
      </TouchableOpacity>
    )}
    <TouchableOpacity
      style={[
        styles.primaryBtn,
        (primaryDisabled || primaryLoading) && styles.primaryBtnDisabled,
      ]}
      onPress={primaryAction}
      disabled={primaryDisabled || primaryLoading}
    >
      <Text style={styles.primaryText}>
        {primaryLoading ? 'Đang xử lý...' : primaryLabel}
      </Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 22 : 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: '#F1B8A8',
  },
  primaryText: { color: colors.white, fontWeight: '800', fontSize: 13.5 },
  secondaryBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.6,
    borderColor: colors.primary,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.primary, fontWeight: '800', fontSize: 13.5 },
});

