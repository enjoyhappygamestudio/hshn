import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../constants/theme';
import { Voucher } from '../types';
import { fetchVouchers } from '../services/api';
import { useCartStore } from '../stores/cartStore';
import { BackButton } from '../components/BackButton';

interface UserVouchersScreenProps {
  navigation: any;
}

export const UserVouchersScreen: React.FC<UserVouchersScreenProps> = ({ navigation }) => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const appliedCode = useCartStore((s) => s.voucher?.code || null);
  const applyVoucher = useCartStore((s) => s.applyVoucher);
  const subtotal = useCartStore((s) => s.subtotal());

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchVouchers();
        setVouchers(data);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelect = useCallback((code: string) => {
    const v = vouchers.find((x) => x.code === code);
    if (!v) return;

    if (appliedCode === code) {
      applyVoucher(null);
    } else {
      if (v.minOrder && subtotal < v.minOrder) {
        Alert.alert(
          'Chưa đủ điều kiện',
          `Đơn tối thiểu ${v.minOrder.toLocaleString('vi-VN')}đ để áp dụng mã này.\nĐơn hiện tại: ${subtotal.toLocaleString('vi-VN')}đ`,
        );
        return;
      }
      applyVoucher(v);
      Alert.alert('Đã áp dụng', `Mã "${v.label}" đã được áp dụng thành công!`);
    }
  }, [vouchers, appliedCode, applyVoucher, subtotal]);

  const renderVoucher = useCallback(({ item }: { item: Voucher }) => {
    const selected = appliedCode === item.code;
    const disabled = !!item.minOrder && subtotal < item.minOrder;

    return (
      <TouchableOpacity
        style={[styles.card, selected && styles.cardSelected, disabled && !selected && styles.cardDisabled]}
        onPress={() => handleSelect(item.code)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, selected && styles.iconSelected]}>
          <Text style={[styles.iconText, selected && styles.iconTextSelected]}>
            {item.icon}
          </Text>
        </View>
        <View style={styles.mid}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.desc}>{item.desc}</Text>
          {item.minOrder ? (
            <Text style={styles.condition}>Đơn tối thiểu {item.minOrder.toLocaleString('vi-VN')}đ</Text>
          ) : null}
        </View>
        <View style={[styles.check, selected && styles.checkSelected]}>
          {selected && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  }, [appliedCode, handleSelect, subtotal]);

  return (
    <SafeAreaView style={commonStyles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Ưu đãi của tôi</Text>
        <View style={{ width: 60 }} />
      </View>

      {appliedCode ? (
        <View style={styles.appliedBar}>
          <Text style={styles.appliedText}>Đã áp dụng mã: <Text style={{ fontWeight: '800' }}>{appliedCode}</Text></Text>
          <TouchableOpacity onPress={() => applyVoucher(null)}>
            <Text style={styles.removeText}>Bỏ chọn</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={vouchers}
          keyExtractor={(item) => item.code}
          renderItem={renderVoucher}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.navy },
  appliedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.mint,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  appliedText: { fontSize: 13, color: colors.primary, flex: 1 },
  removeText: { fontSize: 12, color: colors.danger, fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
  },
  cardSelected: {
    borderStyle: 'solid',
    borderColor: colors.primary,
    backgroundColor: colors.mint,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSelected: { backgroundColor: colors.primary },
  iconText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  iconTextSelected: { color: colors.white },
  mid: { flex: 1 },
  label: { fontSize: 13, fontWeight: '800', color: colors.navy },
  desc: { fontSize: 11, color: colors.muted, marginTop: 2 },
  condition: { fontSize: 11, color: colors.coral, marginTop: 4, fontWeight: '600' },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: { fontSize: 13, color: colors.white, fontWeight: '700' },
});
