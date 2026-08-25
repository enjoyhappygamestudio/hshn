import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VoucherCard } from '../components/VoucherCard';
import { EmptyState } from '../components/EmptyState';
import { BottomNav } from '../components/BottomNav';
import { MediaImage } from '../components/MediaImage';
import { mediaUrl } from '../utils/media';
import { useCartStore } from '../stores/cartStore';
import { colors, radii, fonts, commonStyles } from '../constants/theme';
import { formatMoney } from '../utils/format';
import { Voucher } from '../types';
import { fetchVouchers } from '../services/api';
import { BackButton } from '../components/BackButton';

interface CartScreenProps {
  navigation: any;
}

export const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
  const items = useCartStore((s) => s.items);
  const voucher = useCartStore((s) => s.voucher);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const applyVoucher = useCartStore((s) => s.applyVoucher);
  const count = useCartStore((s) => s.count());
  const subtotal = useCartStore((s) => s.subtotal());
  const discount = useCartStore((s) => s.discount());
  const shippingFee = useCartStore((s) => s.shippingFee());
  const shippingDiscount = useCartStore((s) => s.shippingDiscount());
  const total = useCartStore((s) => s.total());

  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const v = await fetchVouchers();
        if (v.length > 0) setVouchers(v);
      } catch {}
    })();
  }, []);

  const handleConfirmRemove = useCallback(
    (productId: string) => {
      Alert.alert('Xóa sản phẩm?', 'Sản phẩm sẽ được xóa khỏi giỏ hàng của bạn.', [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => removeItem(productId),
        },
      ]);
    },
    [removeItem],
  );

  const handleTabPress = useCallback(
    (tab: string) => {
      if (tab === 'orders') return;
      navigation.navigate('MainTabs');
    },
    [navigation],
  );

  if (items.length === 0) {
    return (
      <SafeAreaView style={commonStyles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>Đơn hàng của bạn</Text>
        </View>
        <EmptyState
          icon="🛒"
          title="Chưa có sản phẩm nào"
          description="Hãy chọn vài món hải sản tươi ngon nhé"
          actionLabel="Tiếp tục mua sắm"
          onAction={() => navigation.navigate('MainTabs')}
        />
        <BottomNav active="orders" onTabPress={handleTabPress} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Đơn hàng của bạn</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {items.map((item, idx) => (
          <View key={item.productId} style={styles.cartItem}>
            <View style={[styles.thumb, { backgroundColor: item.imageBg || colors.mint }]}>
              {item.image ? (
                <MediaImage uri={mediaUrl(item.image) || item.image} style={styles.thumbImg} />
              ) : (
                <Text style={styles.thumbEmoji}>{item.emoji}</Text>
              )}
            </View>
            <View style={styles.mid}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemVariant}>{item.variant}</Text>
              <View style={styles.itemBottom}>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.qtyBtn, item.quantity <= 1 && styles.qtyBtnDisabled]}
                    onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <Text style={[styles.qtyBtnText, item.quantity <= 1 && styles.qtyBtnTextDisabled]}>–</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyVal}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.itemPrice}>{formatMoney(item.price * item.quantity)}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.trash}
              onPress={() => handleConfirmRemove(item.productId)}
            >
              <Text style={styles.trashText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.promoSection}>
          <Text style={styles.promoLabel}>Mã ưu đãi của bạn</Text>
          <View style={styles.voucherList}>
            {vouchers.map((v) => (
              <VoucherCard
                key={v.code}
                voucher={v}
                isSelected={voucher?.code === v.code}
                onSelect={(code) => {
                  if (voucher?.code === code) {
                    applyVoucher(null);
                  } else {
                    const found = vouchers.find((x) => x.code === code);
                    applyVoucher(found || null);
                  }
                }}
              />
            ))}
          </View>
        </View>

        <View style={styles.summary}>
          <View style={[styles.sumRow, discount > 0 && styles.sumDiscount]}>
            <Text style={styles.sumLabel}>Tạm tính</Text>
            <Text style={styles.sumValue}>{formatMoney(subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.sumRow}>
              <Text style={[styles.sumLabel, { color: colors.primary }]}>Giảm giá</Text>
              <Text style={[styles.sumValue, { color: colors.primary }]}>
                -{formatMoney(discount)}
              </Text>
            </View>
          )}
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Phí giao hàng (dự kiến)</Text>
            <Text style={styles.sumValue}>
              {shippingDiscount > 0 ? (
                <>
                  <Text style={{ textDecorationLine: 'line-through', color: colors.muted, fontWeight: '400' }}>
                    {formatMoney(shippingFee)}
                  </Text>
                  {' Miễn phí'}
                </>
              ) : (
                formatMoney(shippingFee)
              )}
            </Text>
          </View>
          <View style={[styles.sumRow, styles.sumTotal]}>
            <Text style={styles.sumLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatMoney(total)}</Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={styles.sticky}>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text style={styles.checkoutBtnText}>Tiến hành thanh toán</Text>
        </TouchableOpacity>
      </View>
      <BottomNav active="orders" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: { fontWeight: '800', color: colors.navy, fontSize: 15.5 },
  cartItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.white,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: { fontSize: 28 },
  thumbImg: { width: 60, height: 60, borderRadius: 12 },
  mid: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '700', color: colors.navy },
  itemVariant: { fontSize: 11.5, color: colors.muted, marginTop: 2, marginBottom: 8 },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: { opacity: 0.35 },
  qtyBtnText: { fontSize: 14, fontWeight: '700', color: colors.navy },
  qtyBtnTextDisabled: { color: colors.muted },
  qtyVal: { fontFamily: fonts.numeric, fontWeight: '700', fontSize: 12.5, minWidth: 16, textAlign: 'center' },
  itemPrice: { fontFamily: fonts.numeric, fontWeight: '800', color: colors.navy, fontSize: 13.5 },
  trash: { padding: 4 },
  trashText: { fontSize: 16 },
  promoSection: { marginHorizontal: 16, marginTop: 14 },
  promoLabel: { fontSize: 12, color: colors.muted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  voucherList: { gap: 10 },
  summary: {
    margin: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    padding: 14,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sumLabel: { fontSize: 13, color: colors.muted },
  sumValue: { fontFamily: fonts.numeric, fontWeight: '700', fontSize: 13, color: colors.navy },
  sumDiscount: {},
  sumTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 10,
    paddingTop: 10,
  },
  totalValue: { fontFamily: fonts.numeric, fontWeight: '800', color: colors.coral, fontSize: 17 },
  sticky: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  checkoutBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnText: { color: colors.white, fontWeight: '800', fontSize: 13.5 },
});
