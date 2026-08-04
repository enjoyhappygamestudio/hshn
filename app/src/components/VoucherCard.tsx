import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Voucher } from '../types';
import { colors, radii, shadows } from '../constants/theme';

interface VoucherCardProps {
  voucher: Voucher;
  isSelected: boolean;
  onSelect: (code: string) => void;
}

export const VoucherCard: React.FC<VoucherCardProps> = React.memo(
  ({ voucher, isSelected, onSelect }) => {
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => onSelect(voucher.code)}
        activeOpacity={0.7}
      >
        <View style={[styles.icon, isSelected && styles.iconSelected]}>
          <Text style={[styles.iconText, isSelected && styles.iconTextSelected]}>
            {voucher.icon}
          </Text>
        </View>
        <View style={styles.mid}>
          <Text style={styles.label}>{voucher.label}</Text>
          <Text style={styles.desc}>{voucher.desc}</Text>
        </View>
        <View style={[styles.check, isSelected && styles.checkSelected]}>
          {isSelected && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
  },
  cardSelected: {
    borderStyle: 'solid',
    borderColor: colors.primary,
    backgroundColor: colors.mint,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSelected: {
    backgroundColor: colors.primary,
  },
  iconText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  iconTextSelected: { color: colors.white },
  mid: { flex: 1 },
  label: { fontSize: 13, fontWeight: '800', color: colors.navy },
  desc: { fontSize: 11, color: colors.muted, marginTop: 2 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: { fontSize: 12, color: colors.white, fontWeight: '700' },
});
