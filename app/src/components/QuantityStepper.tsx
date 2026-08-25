import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii } from '../constants/theme';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  stock?: number;
  onChange: (value: number) => void;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  min = 1,
  max,
  stock,
  onChange,
}) => {
  const effectiveMax = max ?? stock ?? Infinity;
  const isAtMin = value <= min;
  const isAtMax = value >= effectiveMax;

  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, isAtMin && styles.btnDisabled]}
          onPress={() => onChange(value - 1)}
          disabled={isAtMin}
        >
          <Text style={[styles.btnText, isAtMin && styles.btnTextDisabled]}>–</Text>
        </TouchableOpacity>
        <Text style={styles.value}>{value}</Text>
        <TouchableOpacity
          style={[styles.btn, isAtMax && styles.btnDisabled]}
          onPress={() => onChange(value + 1)}
          disabled={isAtMax}
        >
          <Text style={[styles.btnText, isAtMax && styles.btnTextDisabled]}>+</Text>
        </TouchableOpacity>
        {stock != null && (
          <Text style={styles.stock}>Còn {stock} trong kho</Text>
        )}
      </View>
      {isAtMax && stock != null && (
        <Text style={styles.warning}>Bạn đã chọn tối đa số lượng còn trong kho.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontSize: 18, fontWeight: '700', color: colors.navy },
  btnTextDisabled: { color: colors.muted },
  value: { fontFamily: 'Inter', fontWeight: '800', fontSize: 16, minWidth: 24, textAlign: 'center' },
  stock: { fontSize: 11.5, color: colors.muted, marginLeft: 6 },
  warning: { fontSize: 11.5, color: colors.danger, marginTop: 8 },
});
