import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { geocodeAddress } from '../utils/geocode';
import { ActionBar } from '../components/ActionBar';
import { useCartStore } from '../stores/cartStore';
import { useCheckoutStore } from '../stores/checkoutStore';
import { TIME_SLOTS } from '../constants/data';
import { colors, radii, fonts, commonStyles } from '../constants/theme';
import { formatMoney, todayISO, formatDateVN } from '../utils/format';
import { createOrder, fetchShippingPartners, fetchShippingFee } from '../services/api';
import { ShippingPartner } from '../types';
import { useAuthStore } from '../stores/authStore';
import { BackButton } from '../components/BackButton';

interface CheckoutScreenProps {
  navigation: any;
}

const PAYMENT_OPTIONS = [
  { id: 'cod' as const, icon: '💵', label: 'Thanh toán khi nhận hàng (COD)', disabled: false },
  { id: 'wallet' as const, icon: '📱', label: 'Ví điện tử', disabled: true },
  { id: 'card' as const, icon: '💳', label: 'Thẻ ngân hàng', disabled: true },
];

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const cartCount = useCartStore((s) => s.count());
  const subtotal = useCartStore((s) => s.subtotal());
  const discount = useCartStore((s) => s.discount());
  const shippingDiscount = useCartStore((s) => s.shippingDiscount());

  const delivery = useCheckoutStore((s) => s.delivery);
  const paymentMethod = useCheckoutStore((s) => s.paymentMethod);
  const note = useCheckoutStore((s) => s.note);
  const setDeliveryMode = useCheckoutStore((s) => s.setDeliveryMode);
  const setDeliveryDate = useCheckoutStore((s) => s.setDeliveryDate);
  const setDeliveryTimeSlot = useCheckoutStore((s) => s.setDeliveryTimeSlot);
  const setPaymentMethod = useCheckoutStore((s) => s.setPaymentMethod);
  const setNote = useCheckoutStore((s) => s.setNote);
  const deliveryIsValid = useCheckoutStore((s) => s.deliveryIsValid);

  const [slotWarn, setSlotWarn] = useState(false);
  const [payWarn, setPayWarn] = useState(false);
  const [partnerWarn, setPartnerWarn] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [reqInvoice, setReqInvoice] = useState(false);
  const [invCompany, setInvCompany] = useState('');
  const [invTaxCode, setInvTaxCode] = useState('');
  const [invAddress, setInvAddress] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invRep, setInvRep] = useState('');
  const [shippingPartners, setShippingPartners] = useState<ShippingPartner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [baseFee, setBaseFee] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [geoFailed, setGeoFailed] = useState(false);
  const feeReqRef = useRef(0);

  const cartWeight = useCallback(() => {
    const items = useCartStore.getState().items;
    return Math.max(0.5, items.reduce((s, i) => s + i.quantity * (i.weight || 1), 0));
  }, []);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dpDay, setDpDay] = useState(1);
  const [dpMonth, setDpMonth] = useState(1);
  const [dpYear, setDpYear] = useState(new Date().getFullYear());

  const customer = useAuthStore((s) => s.customer);
  const [deliveryAddress, setDeliveryAddress] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    full: customer?.address || '',
  });

  useEffect(() => {
    setDeliveryAddress({
      name: customer?.name || '',
      phone: customer?.phone || '',
      full: customer?.address || '',
    });
  }, [customer]);

  const loadFee = useCallback(async (partner: ShippingPartner, lat?: number, lng?: number) => {
    const reqId = ++feeReqRef.current;
    setBaseFee(null);
    setFeeLoading(true);
    try {
      const results = await fetchShippingFee(partner.name, lat, lng, cartWeight());
      if (reqId !== feeReqRef.current) return;
      const r = Array.isArray(results) ? results[0] : undefined;
      setBaseFee(r && r.fee > 0 ? r.fee : null);
    } catch {
      if (reqId === feeReqRef.current) setBaseFee(null);
    } finally {
      if (reqId === feeReqRef.current) setFeeLoading(false);
    }
  }, [cartWeight]);

  const handleSelectPartner = useCallback(async (partner: ShippingPartner) => {
    setSelectedPartner(partner.id);
    loadFee(partner, deliveryCoords?.lat, deliveryCoords?.lng);
  }, [loadFee, deliveryCoords]);

  useEffect(() => {
    (async () => {
      try {
        let lat: number | undefined;
        let lng: number | undefined;
        const addr = customer?.address || '';
        const coords = await geocodeAddress(addr);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
          setDeliveryCoords(coords);
          setGeoFailed(false);
        } else {
          setGeoFailed(true);
        }
        const weight = cartWeight();
        const partners = await fetchShippingPartners(lat, lng, weight, false);
        const sorted = [...partners].sort(
          (a, b) =>
            Number(b.name.toLowerCase().includes('ahamove')) -
            Number(a.name.toLowerCase().includes('ahamove')),
        );
        setShippingPartners(sorted);
        setBaseFee(null);
        if (partners.length > 0) {
          const aha = partners.find((p) => p.name.toLowerCase().includes('ahamove'));
          const chosen = aha || partners[0];
          setSelectedPartner(chosen.id);
          loadFee(chosen, lat, lng);
        } else {
          setSelectedPartner(null);
        }
      } catch {} finally {
        setLoadingPartners(false);
      }
    })();
  }, [customer?.address, cartWeight, loadFee]);

  const selectedFee = baseFee;

  const isAhaMove = !!shippingPartners.find(
    (p) => p.id === selectedPartner && p.name.toLowerCase().includes('ahamove'),
  );

  useEffect(() => {
    useCheckoutStore.getState().setCustomShipFee(selectedFee ?? 0);
  }, [selectedFee]);

  const openDatePicker = useCallback(() => {
    const base = delivery.date ? new Date(delivery.date + 'T00:00:00') : new Date();
    setDpDay(base.getDate());
    setDpMonth(base.getMonth() + 1);
    setDpYear(base.getFullYear());
    setShowDatePicker(true);
  }, [delivery.date]);

  const daysInMonth = useCallback((m: number, y: number) => new Date(y, m, 0).getDate(), []);

  const confirmDatePicker = useCallback(() => {
    const dim = daysInMonth(dpMonth, dpYear);
    const day = Math.min(dpDay, dim);
    const iso = `${dpYear}-${String(dpMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setDeliveryDate(iso);
    setShowDatePicker(false);
  }, [dpDay, dpMonth, dpYear, daysInMonth, setDeliveryDate]);

  const yearNow = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => yearNow + i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const renderDateColumn = (items: number[], value: number, onSelect: (v: number) => void, label: string) => (
    <View style={styles.dpColumn}>
      <Text style={styles.dpColLabel}>{label}</Text>
      <ScrollView style={styles.dpList} showsVerticalScrollIndicator={false}>
        {items.map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.dpItem, v === value && styles.dpItemSel]}
            onPress={() => onSelect(v)}
          >
            <Text style={[styles.dpItemText, v === value && styles.dpItemTextSel]}>
              {String(v).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const handlePlaceOrder = useCallback(async () => {
    const slotOk = deliveryIsValid();
    const payOk = paymentMethod != null;
    const coordsOk = deliveryCoords != null;
    const partnerOk = selectedPartner != null && baseFee != null && !feeLoading;

    setSlotWarn(!slotOk && delivery.mode === 'appointment');
    setPayWarn(!payOk);
    setPartnerWarn(!partnerOk);

    if (!slotOk || !payOk || !partnerOk || !coordsOk) return;

    setIsPlacing(true);
    try {
      const items = useCartStore.getState().items;
      const subtotal = useCartStore.getState().subtotal();
      const discount = useCartStore.getState().discount();
      const shipFee = useCheckoutStore.getState().currentShipFee();
      const shipmentDisc = useCartStore.getState().shippingDiscount();
      const voucher = useCartStore.getState().voucher;
      const total = Math.max(subtotal - discount + shipFee - shipmentDisc, 0);

      const orderData: Record<string, any> = {
        items: items.map(i => ({
          product_id: i.productId,
          name: i.name,
          variant: i.variant,
          price: i.price,
          quantity: i.quantity,
          image: i.image || '',
          weight: i.weight || 1,
        })),
        subtotal,
        discount,
        shipping_fee: shipFee,
        total,
        voucher_code: voucher?.code || null,
        delivery_mode: delivery.mode,
        delivery_date: delivery.date,
        delivery_time: delivery.timeSlot,
        payment_method: paymentMethod,
        note: note || undefined,
        address_snapshot: { ...deliveryAddress, ...(deliveryCoords || {}) },
        invoice_requested: reqInvoice,
        shipping_partner_id: selectedPartner,
      };

      if (reqInvoice) {
        orderData.invoice_company_name = invCompany;
        orderData.invoice_tax_code = invTaxCode;
        orderData.invoice_company_address = invAddress;
        orderData.invoice_email = invEmail;
        orderData.invoice_representative = invRep || undefined;
      }

      const order = await createOrder(orderData);
      navigation.navigate('Success', { orderCode: order.code });
    } catch (e: any) {
      Alert.alert('Đặt hàng thất bại', e.message || 'Vui lòng thử lại sau');
    } finally {
      setIsPlacing(false);
    }
  }, [deliveryIsValid, paymentMethod, delivery, note, reqInvoice, invCompany, invTaxCode, invAddress, invEmail, invRep, deliveryAddress, selectedPartner, baseFee, feeLoading, deliveryCoords, navigation]);

  const total =
    subtotal - discount + (selectedFee ?? 0) - shippingDiscount;
  const shipFeeToDisplay = selectedFee ?? 0;

  return (
    <SafeAreaView style={commonStyles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Thanh toán</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.block}>
          <View style={styles.blockHead}>
            <Text style={styles.blockLabel}>Địa chỉ nhận hàng</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddressList')}>
              <Text style={styles.blockEdit}>Đổi</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.addrName}>{deliveryAddress.name}</Text>
          <Text style={styles.addrPhone}>{deliveryAddress.phone}</Text>
          <Text style={styles.addrFull}>{deliveryAddress.full}</Text>
        </View>

        <View style={styles.block}>
          <View style={styles.blockHead}>
            <Text style={styles.blockLabel}>Đơn vị giao hàng</Text>
          </View>
          {loadingPartners ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
          ) : shippingPartners.length === 0 ? (
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>
              Không có đơn vị giao hàng khả dụng
            </Text>
          ) : (
            shippingPartners.map((partner) => (
              <TouchableOpacity
                key={partner.id}
                style={[
                  styles.payOption,
                  selectedPartner === partner.id && styles.payOptionSel,
                  !partner.isReal && styles.partnerDisabled,
                ]}
                onPress={() => partner.isReal && handleSelectPartner(partner)}
                disabled={!partner.isReal}
              >
                <View
                  style={[
                    styles.radio,
                    selectedPartner === partner.id && styles.radioSel,
                  ]}
                >
                  {selectedPartner === partner.id && <View style={styles.radioInner} />}
                </View>
                <Text style={{ fontSize: 20 }}>{partner.logo}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.navy }}>
                    {partner.name}
                  </Text>
                  {selectedPartner === partner.id ? (
                    feeLoading ? (
                      <Text style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>
                        Đang tính phí...
                      </Text>
                    ) : baseFee != null ? (
                      <Text style={{ fontSize: 11, color: colors.primary, marginTop: 1 }}>
                        {formatMoney(shipFeeToDisplay)} · {partner.timeText}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>
                        {geoFailed
                          ? 'Không xác định được vị trí giao hàng'
                          : 'Chưa tích hợp API đặt ship'}
                      </Text>
                    )
                  ) : (
                    <Text style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>
                      {partner.timeText}
                    </Text>
                  )}
                </View>
                {partner.rating > 0 && (
                  <Text style={{ fontSize: 11, color: colors.muted }}>
                    ⭐ {partner.rating}
                  </Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {isAhaMove && (
          <View style={styles.block} id="deliveryBlock">
            <View style={styles.blockHead}>
              <Text style={styles.blockLabel}>Thời gian giao</Text>
            </View>
            <View style={styles.slotOptions}>
              <TouchableOpacity
                style={[
                  styles.slot,
                  delivery.mode === 'hoatoc' && styles.slotSel,
                ]}
                onPress={() => setDeliveryMode('hoatoc')}
              >
                <Text style={styles.slotText}>⚡ Siêu tốc</Text>
                <Text style={styles.slotSub}>Ưu tiên trong 30p</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.slot,
                  delivery.mode === 'express2h' && styles.slotSel,
                ]}
                onPress={() => setDeliveryMode('express2h')}
              >
                <Text style={styles.slotText}>🚀 Siêu tốc - tiết kiệm</Text>
                <Text style={styles.slotSub}>Trong 1 giờ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.slot,
                  delivery.mode === 'interprovince' && styles.slotSel,
                ]}
                onPress={() => setDeliveryMode('interprovince')}
              >
                <Text style={styles.slotText}>🛵 4H</Text>
                <Text style={styles.slotSub}>Giao siêu rẻ trong 4h</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.slot,
                  delivery.mode === 'appointment' && styles.slotSel,
                ]}
                onPress={() => setDeliveryMode('appointment')}
              >
                <Text style={styles.slotText}>📅 Hẹn ngày giao</Text>
              </TouchableOpacity>
            </View>

            {delivery.mode === 'appointment' && (
              <View style={styles.dateTimeRow}>
                <View style={styles.dtField}>
                  <Text style={styles.dtLabel}>Ngày giao</Text>
                  <TouchableOpacity style={styles.dtInput} onPress={openDatePicker}>
                    <Text style={{ color: delivery.date ? colors.navy : colors.muted, fontSize: 11, fontWeight: '600' }}>
                      {delivery.date ? formatDateVN(delivery.date) : 'Chọn ngày'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dtField}>
                  <Text style={styles.dtLabel}>Khung giờ</Text>
                  <View style={styles.timeSlotList}>
                    {TIME_SLOTS.map((t) => (
                      <TouchableOpacity
                        key={t.value}
                        style={[
                          styles.timeSlot,
                          delivery.timeSlot === t.value && styles.timeSlotSel,
                        ]}
                        onPress={() => setDeliveryTimeSlot(t.value)}
                      >
                        <Text
                          style={[
                            styles.timeSlotText,
                            delivery.timeSlot === t.value && styles.timeSlotTextSel,
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {delivery.mode === 'hoatoc' && (
              <Text style={styles.feeNote}>
                ⚡ Giao siêu tốc — tài xế ưu tiên nhận đơn trong 30 phút.
              </Text>
            )}
            {delivery.mode === 'express2h' && (
              <Text style={styles.feeNote}>
                🚀 Giao tiết kiệm trong 1 giờ tại nội thành Hà Nội.
              </Text>
            )}
            {delivery.mode === 'interprovince' && (
              <Text style={styles.feeNote}>
                🛵 Giao 4H — siêu rẻ, thời gian dự kiến trong 4 giờ.
              </Text>
            )}
          </View>
        )}

          {selectedPartner && (
            <Text style={styles.feeNote}>
              {feeLoading ? (
                'Đang tính phí giao hàng...'
              ) : baseFee != null ? (
                <>
                  Phí giao hàng:{' '}
                  <Text style={styles.feeBold}>{formatMoney(shipFeeToDisplay)}</Text>
                  {' '}(tạm tính theo giá hiện tại)
                </>
              ) : geoFailed ? (
                'Không xác định được vị trí giao hàng'
              ) : (
                'Chưa tính được phí giao hàng, vui lòng thử lại'
              )}
            </Text>
          )}
          {geoFailed && (
            <Text style={styles.warnText}>
              Không xác định được vị trí địa chỉ nhận hàng. Vui lòng cập nhật địa chỉ đầy đủ
              (số nhà, phường/quận, Hà Nội) trong phần địa chỉ.
            </Text>
          )}
          {slotWarn && (
            <Text style={styles.warnText}>
              Vui lòng chọn thời gian giao hàng (ngày và khung giờ).
            </Text>
          )}
          {partnerWarn && (
            <Text style={styles.warnText}>
              Vui lòng chọn đơn vị giao hàng.
            </Text>
          )}

        <View style={styles.block}>
          <View style={styles.blockHead}>
            <Text style={styles.blockLabel}>Phương thức thanh toán</Text>
          </View>
          {PAYMENT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.payOption,
                paymentMethod === opt.id && styles.payOptionSel,
                opt.disabled && styles.partnerDisabled,
              ]}
              onPress={() => !opt.disabled && setPaymentMethod(opt.id)}
              disabled={opt.disabled}
            >
              <View
                style={[
                  styles.radio,
                  paymentMethod === opt.id && styles.radioSel,
                ]}
              >
                {paymentMethod === opt.id && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.payIcon}>{opt.icon}</Text>
              <Text style={styles.payName}>{opt.label}</Text>
              {opt.disabled && (
                <Text style={{ fontSize: 10, color: colors.muted }}>
                  Sắp mở
                </Text>
              )}
            </TouchableOpacity>
          ))}
          {payWarn && (
            <Text style={styles.warnText}>Vui lòng chọn phương thức thanh toán.</Text>
          )}
        </View>

        <View style={styles.block}>
          <View style={styles.blockHead}>
            <Text style={styles.blockLabel}>Ghi chú</Text>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="Ví dụ: giao giờ hành chính, gọi trước khi giao..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={2}
            value={note}
            onChangeText={setNote}
          />
        </View>

        <View style={styles.block}>
          <TouchableOpacity
            style={styles.invToggle}
            onPress={() => setReqInvoice(!reqInvoice)}
          >
            <View style={[styles.checkbox, reqInvoice && styles.checkboxOn]}>
              {reqInvoice && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.invToggleText}>Yêu cầu xuất hóa đơn VAT</Text>
          </TouchableOpacity>

          {reqInvoice && (
            <View style={styles.invFields}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tên công ty <Text style={{ color: colors.danger }}>*</Text></Text>
                <TextInput style={styles.formInput} placeholder="Công ty TNHH ABC" placeholderTextColor={colors.muted} value={invCompany} onChangeText={setInvCompany} />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mã số thuế <Text style={{ color: colors.danger }}>*</Text></Text>
                <TextInput style={styles.formInput} placeholder="0123456789" placeholderTextColor={colors.muted} value={invTaxCode} onChangeText={setInvTaxCode} keyboardType="number-pad" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Địa chỉ công ty <Text style={{ color: colors.danger }}>*</Text></Text>
                <TextInput style={styles.formInput} placeholder="Số nhà, đường, phường, quận..." placeholderTextColor={colors.muted} value={invAddress} onChangeText={setInvAddress} multiline />
              </View>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Email nhận hóa đơn <Text style={{ color: colors.danger }}>*</Text></Text>
                  <TextInput style={styles.formInput} placeholder="email@example.com" placeholderTextColor={colors.muted} value={invEmail} onChangeText={setInvEmail} keyboardType="email-address" />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Người đại diện</Text>
                  <TextInput style={styles.formInput} placeholder="Họ tên" placeholderTextColor={colors.muted} value={invRep} onChangeText={setInvRep} />
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.summary}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>{cartCount} sản phẩm</Text>
            <Text style={styles.sumValue}>{formatMoney(subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.sumRow}>
              <Text style={[styles.sumLabel, { color: colors.primary }]}>Ưu đãi</Text>
              <Text style={[styles.sumValue, { color: colors.primary }]}>
                -{formatMoney(discount)}
              </Text>
            </View>
          )}
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Phí giao hàng</Text>
            <Text style={styles.sumValue}>
              {feeLoading ? (
                'Đang tính...'
              ) : selectedFee != null ? (
                shippingDiscount > 0 ? (
                <>
                  <Text
                    style={{
                      textDecorationLine: 'line-through',
                      color: colors.muted,
                      fontWeight: '400',
                    }}
                  >
                    {formatMoney(shipFeeToDisplay)}
                  </Text>
                  {' Miễn phí'}
                </>
              ) : (
                formatMoney(shipFeeToDisplay)
              )
              ) : (
                geoFailed ? 'Không xác định vị trí' : '—'
              )}
            </Text>
          </View>
          <View style={[styles.sumRow, styles.sumTotal]}>
            <Text style={styles.sumLabel}>Tổng thanh toán</Text>
            <Text style={styles.totalValue}>
              {feeLoading
                ? 'Đang tính...'
                : selectedFee != null
                  ? formatMoney(Math.max(total, 0))
                  : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.trust}>
          <Text style={styles.trustText}>🛡️ Thanh toán an toàn — thông tin của bạn được bảo mật</Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <ActionBar
        primaryLabel="Đặt hàng"
        primaryAction={handlePlaceOrder}
        primaryLoading={isPlacing}
      />

      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.dpOverlay}>
          <View style={styles.dpModal}>
            <View style={styles.dpHeader}>
              <Text style={styles.dpTitle}>Chọn ngày giao</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.dpClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dpRow}>
              {renderDateColumn(days, dpDay, setDpDay, 'Ngày')}
              {renderDateColumn(months, dpMonth, setDpMonth, 'Tháng')}
              {renderDateColumn(years, dpYear, setDpYear, 'Năm')}
            </View>
            <View style={styles.dpActions}>
              <TouchableOpacity style={styles.dpBtnCancel} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.dpBtnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dpBtnConfirm} onPress={confirmDatePicker}>
                <Text style={styles.dpBtnConfirmText}>Chọn ngày</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  block: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    padding: 14,
  },
  blockHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  blockLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  blockEdit: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  addrName: { fontSize: 14, fontWeight: '800', color: colors.navy, marginTop: 4 },
  addrPhone: { fontSize: 12.5, color: colors.muted, marginVertical: 2 },
  addrFull: { fontSize: 13, color: '#3d5560', lineHeight: 18 },
  slotOptions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  slot: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  slotSel: { borderColor: colors.primary, backgroundColor: colors.mint },
  slotText: { fontSize: 12, fontWeight: '700', color: colors.navy },
  slotSub: { fontFamily: fonts.numeric, fontWeight: '700', fontSize: 10, marginTop: 2, opacity: 0.8, color: colors.coralDark },
  dateTimeRow: { marginTop: 12 },
  dtField: { marginBottom: 10 },
  dtLabel: { fontSize: 11, color: colors.muted, fontWeight: '700', marginBottom: 5 },
  dtInput: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
  },
  timeSlotList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  timeSlotSel: { borderColor: colors.primary, backgroundColor: colors.mint },
  timeSlotText: { fontSize: 11, fontWeight: '600', color: colors.navy },
  timeSlotTextSel: { color: colors.primary, fontWeight: '700' },
  feeNote: { fontSize: 11.5, color: colors.muted, marginTop: 10 },
  feeBold: { fontFamily: fonts.numeric, color: colors.navy, fontWeight: '800' },
  warnText: { fontSize: 11.5, color: colors.danger, marginTop: 8 },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  payOptionSel: {},
  partnerDisabled: { opacity: 0.5 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSel: { borderColor: colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  payIcon: { fontSize: 20 },
  payName: { fontSize: 13.5, fontWeight: '700', color: colors.navy, flex: 1 },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: colors.navy,
    marginTop: 8,
    backgroundColor: colors.white,
    textAlignVertical: 'top',
    minHeight: 60,
  },
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
  sumTotal: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 10, paddingTop: 10 },
  totalValue: { fontFamily: fonts.numeric, fontWeight: '800', color: colors.coral, fontSize: 17 },
  trust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  trustText: { fontSize: 11.5, color: colors.muted },
  invToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: { fontSize: 13, color: colors.white, fontWeight: '700' },
  invToggleText: { fontSize: 14, fontWeight: '700', color: colors.navy, flex: 1 },
  invFields: { marginTop: 14, gap: 12 },
  formGroup: {},
  formLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 4 },
  formInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: colors.navy,
    backgroundColor: colors.white,
  },
  formRow: { flexDirection: 'row', gap: 12 },
  dpOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dpModal: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  dpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dpTitle: { fontSize: 15, fontWeight: '800', color: colors.navy },
  dpClose: { fontSize: 16, color: colors.muted, padding: 4 },
  dpRow: {
    flexDirection: 'row',
    height: 260,
    paddingHorizontal: 8,
  },
  dpColumn: { flex: 1, alignItems: 'center' },
  dpColLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 4,
  },
  dpList: { flex: 1, width: '100%' },
  dpItem: {
    paddingVertical: 9,
    alignItems: 'center',
    marginHorizontal: 6,
    borderRadius: 8,
  },
  dpItemSel: { backgroundColor: colors.primary },
  dpItemText: { fontSize: 15, color: colors.navy },
  dpItemTextSel: { color: colors.white, fontWeight: '700' },
  dpActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  dpBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  dpBtnCancelText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  dpBtnConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  dpBtnConfirmText: { fontSize: 13, fontWeight: '800', color: colors.white },
});
