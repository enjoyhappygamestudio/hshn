import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartStore } from '../stores/cartStore';
import { useCheckoutStore } from '../stores/checkoutStore';
import { colors, radii, fonts, commonStyles } from '../constants/theme';
import { formatMoney, formatDateVN } from '../utils/format';
import { TIME_SLOTS } from '../constants/data';

interface SuccessScreenProps {
  navigation: any;
  route?: any;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ navigation, route }) => {
  const total = useCartStore((s) => s.total());
  const delivery = useCheckoutStore((s) => s.delivery);
  const orderCode = route?.params?.orderCode;

  const slotLabel = () => {
    if (delivery.mode === 'hoatoc') return 'Siêu tốc (30 phút)';
    if (delivery.mode === 'express2h') return 'Siêu tốc tiết kiệm (1 giờ)';
    if (delivery.mode === 'interprovince') return '4H siêu rẻ (4 giờ)';
    if (delivery.mode === 'appointment' && delivery.date && delivery.timeSlot) {
      const t = TIME_SLOTS.find((x) => x.value === delivery.timeSlot);
      return `${formatDateVN(delivery.date)}, ${t ? t.label : ''}`;
    }
    return 'Chưa chọn thời gian giao';
  };

  const handleTracking = useCallback(() => {
    navigation.navigate('Tracking', orderCode ? { orderCode } : undefined);
  }, [navigation, orderCode]);

  const handleContinue = useCallback(() => {
    useCartStore.getState().clearCart();
    useCheckoutStore.getState().reset();
    navigation.navigate('MainTabs');
  }, [navigation]);

  return (
    <SafeAreaView style={commonStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <View style={{ width: 32 }} />
        <Text style={styles.headerTitle}>Đặt hàng</Text>
      </View>

      <View style={styles.wrap}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>✓</Text>
        </View>
        <Text style={styles.title}>Đặt hàng thành công!</Text>
        <Text style={styles.desc}>
          Cảm ơn bạn đã tin chọn Hải Sản Hà Nội. Đơn hàng đang được chuẩn bị.
        </Text>

        <View style={styles.codeBox}>
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>Mã đơn hàng</Text>
            <Text style={styles.codeValue}>{orderCode ? `#${orderCode}` : '#HSHN-20486'}</Text>
          </View>
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>Tổng thanh toán</Text>
            <Text style={styles.codeValue}>{formatMoney(total)}</Text>
          </View>
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>Thời gian giao dự kiến</Text>
            <Text style={styles.codeValue}>{slotLabel()}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleTracking}
        >
          <Text style={styles.primaryBtnText}>Theo dõi đơn hàng</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleContinue}
        >
          <Text style={styles.secondaryBtnText}>Tiếp tục mua sắm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: { fontWeight: '800', color: colors.navy, fontSize: 15.5 },
  wrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingTop: 60,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  icon: { color: colors.primary, fontSize: 42, fontWeight: '700' },
  title: { color: colors.navy, fontSize: 19, fontWeight: '800', marginBottom: 6 },
  desc: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  codeBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 14,
    width: '100%',
    marginBottom: 24,
    gap: 8,
  },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  codeLabel: { fontSize: 12.5, color: colors.muted, flexShrink: 0 },
  codeValue: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '800',
    color: colors.navy,
    fontFamily: fonts.numeric,
    fontSize: 12.5,
    lineHeight: 18,
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: colors.white, fontWeight: '800', fontSize: 13.5 },
  secondaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.6,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: colors.primary, fontWeight: '800', fontSize: 13.5 },
});
