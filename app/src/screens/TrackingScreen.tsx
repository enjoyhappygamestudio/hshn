import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useCartStore } from '../stores/cartStore';
import { useCheckoutStore } from '../stores/checkoutStore';
import { colors, radii, commonStyles } from '../constants/theme';
import { formatMoney } from '../utils/format';
import { Order, OrderTrackingPayload, TrackPoint, Product } from '../types';
import { fetchOrderDetail, fetchOrderTracking, cancelOrder } from '../services/api';
import { BackButton } from '../components/BackButton';

interface TrackingScreenProps {
  navigation: any;
  route?: any;
}

interface MapPoint {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
}

const POLL_INTERVAL = 15000;

function dist(a: MapPoint, b: MapPoint): number {
  return Math.hypot(a.lat - b.lat, a.lng - b.lng);
}

function pointAtFraction(route: MapPoint[], fraction: number): MapPoint | null {
  if (!route.length) return null;
  if (route.length === 1) return route[0];
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const d = dist(route[i - 1], route[i]);
    segs.push(d);
    total += d;
  }
  if (total === 0) return route[0];
  let target = Math.max(0, Math.min(1, fraction)) * total;
  let acc = 0;
  for (let i = 1; i < route.length; i++) {
    if (acc + segs[i - 1] >= target || i === route.length - 1) {
      const t = segs[i - 1] > 0 ? (target - acc) / segs[i - 1] : 0;
      return {
        lat: route[i - 1].lat + (route[i].lat - route[i - 1].lat) * t,
        lng: route[i - 1].lng + (route[i].lng - route[i - 1].lng) * t,
      };
    }
    acc += segs[i - 1];
  }
  return route[route.length - 1];
}

function computeDriver(track: OrderTrackingPayload | null): { lat: number; lng: number; waiting: boolean } | null {
  const live = track?.live;
  const pickup = live?.pickup;
  const delivery = live?.delivery;
  const route = (live?.route || []) as MapPoint[];
  if (!pickup) return null;
  if (live?.currentLat != null && live?.currentLng != null) {
    return { lat: live.currentLat, lng: live.currentLng, waiting: false };
  }
  const status = live?.status || track?.carrierStatus || '';
  const now = Date.now() / 1000;

  const progressFrom = (start?: number, total?: number) => {
    if (!start || !total) return 0.3;
    const p = (now - start) / total;
    return Math.max(0, Math.min(1, p));
  };

  if (status === 'COMPLETED' && delivery) return { lat: delivery.lat, lng: delivery.lng, waiting: false };
  if (status === 'ASSIGNING' || !live?.driver) return { lat: pickup.lat, lng: pickup.lng, waiting: true };

  if (status === 'ACCEPTED' && live.accept?.lat != null && live.accept?.lng != null) {
    const p = progressFrom(live.accept.time, Math.max(live.durationSec || 600, 60));
    return {
      lat: live.accept.lat + (pickup.lat - live.accept.lat) * p,
      lng: live.accept.lng + (pickup.lng - live.accept.lng) * p,
      waiting: false,
    };
  }

  if ((status === 'IN PROCESS' || status === 'ACCEPTED') && route.length >= 2) {
    const p = progressFrom(live.timestamps?.boarded || live.timestamps?.pickedUp, live.durationSec);
    const point = pointAtFraction(route, p);
    return point ? { ...point, waiting: false } : null;
  }

  return { lat: pickup.lat, lng: pickup.lng, waiting: false };
}

function buildMapHtml(pickup?: MapPoint, delivery?: MapPoint, route?: TrackPoint[]): string {
  const routeJson = JSON.stringify(route || []);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; }
  .shop-icon, .home-icon { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 17px; background: #fff; border: 2px solid #16a085; box-shadow: 0 2px 6px rgba(0,0,0,.25); font-size: 17px; }
  .home-icon { border-color: #ff6b6b; }
  .driver-icon { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 20px; background: #fff; border: 2px solid #ff6b6b; box-shadow: 0 2px 8px rgba(0,0,0,.3); font-size: 22px; }
  .driver-chip { position: absolute; top: 42px; left: -20px; background: #ff6b6b; color: #fff; font-size: 11px; font-family: sans-serif; padding: 2px 8px; border-radius: 8px; white-space: nowrap; }
</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map').setView([21.0285, 105.852], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 18 }).addTo(map);

var shopMarker = null, homeMarker = null, routeLine = null;
var driverMarker = null, driverChip = null;
var hasData = false;

var pickup = ${JSON.stringify(pickup || null)};
var delivery = ${JSON.stringify(delivery || null)};
var route = ${routeJson};

if (pickup) {
  shopMarker = L.marker([pickup.lat, pickup.lng], {
    icon: L.divIcon({ className: '', html: '<div class="shop-icon">&#x1F3EC;</div>', iconSize: [34, 34], iconAnchor: [17, 17] })
  }).addTo(map).bindTooltip('Cửa hàng');
  hasData = true;
}
if (delivery) {
  homeMarker = L.marker([delivery.lat, delivery.lng], {
    icon: L.divIcon({ className: '', html: '<div class="home-icon">&#x1F3E0;</div>', iconSize: [34, 34], iconAnchor: [17, 17] })
  }).addTo(map).bindTooltip('Điểm giao');
  hasData = true;
}
if (route && route.length >= 2) {
  routeLine = L.polyline(route.map(function(p){ return [p.lat, p.lng]; }), {
    color: '#16a085', weight: 4, opacity: .85, dashArray: '1 8', lineCap: 'round'
  }).addTo(map);
}

if (hasData) {
  var bounds = L.latLngBounds([]);
  if (pickup) bounds.extend([pickup.lat, pickup.lng]);
  if (delivery) bounds.extend([delivery.lat, delivery.lng]);
  if (route && route.length) route.forEach(function(p){ bounds.extend([p.lat, p.lng]); });
  map.fitBounds(bounds, { padding: [46, 46] });
  if (map.getZoom() > 16) map.setZoom(16);
}

window.setDriver = function(lat, lng, waiting) {
  if (!lat || !lng) return;
  if (!driverMarker) {
    driverMarker = L.marker([lat, lng], {
      icon: L.divIcon({ className: '', html: '<div class="driver-icon">&#x1F6F5;</div><div class="driver-chip">Tài xế</div>', iconSize: [40, 62], iconAnchor: [20, 40] }),
      zIndexOffset: 1000
    }).addTo(map);
  } else {
    driverMarker.setLatLng([lat, lng]);
  }
};
</script>
</body>
</html>`;
}

export const TrackingScreen: React.FC<TrackingScreenProps> = ({ navigation, route }) => {
  const orderCode = route?.params?.orderCode;
  const webviewRef = useRef<any>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [track, setTrack] = useState<OrderTrackingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [cancelling, setCancelling] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderCode) return;
    try {
      const o = await fetchOrderDetail(orderCode);
      setOrder(o);
    } catch (e: any) {
      setError(e.message || 'Không tải được đơn hàng');
    }
  }, [orderCode]);

  const loadTracking = useCallback(async () => {
    if (!orderCode) return;
    try {
      const t = await fetchOrderTracking(orderCode);
      setTrack(t);
      setError(null);
      setLastUpdate(Date.now());
    } catch (e: any) {
      if (!track) setError(e.message || 'Không tải được trạng thái vận chuyển');
    }
  }, [orderCode]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      await Promise.all([loadOrder(), loadTracking()]);
      setLoading(false);
    })();
    const timer = setInterval(loadTracking, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [loadOrder, loadTracking]);

  const mapData = useMemo(() => {
    const live = track?.live;
    return {
      pickup: (live?.pickup || undefined) as MapPoint | undefined,
      delivery: (live?.delivery || undefined) as MapPoint | undefined,
      route: live?.route || [],
    };
  }, [track]);

  const mapHtml = useMemo(() => {
    const pickup = mapData.pickup ? { ...mapData.pickup } : undefined;
    const delivery = mapData.delivery ? { ...mapData.delivery } : undefined;
    const route = (mapData.route || []).map((p) => ({ ...p }));
    return buildMapHtml(pickup, delivery, route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(mapData.pickup), JSON.stringify(mapData.delivery), JSON.stringify(mapData.route)]);

  useEffect(() => {
    const driver = computeDriver(track);
    if (driver && webviewRef.current) {
      const js = `window.setDriver && window.setDriver(${driver.lat}, ${driver.lng}, ${driver.waiting});`;
      try {
        webviewRef.current.injectJavaScript(js);
      } catch {}
    }
  }, [track, lastUpdate]);

  const live = track?.live;
  const steps = useMemo(() => {
    if (order?.status === 'cancelled') {
      return [{ label: 'Đã hủy', done: false, active: true }];
    }
    const base = [
      { label: 'Chờ xác nhận', done: false, active: false },
      { label: 'Đang giao', done: false, active: false },
      { label: 'Đã giao', done: false, active: false },
    ];
    if (order?.status === 'pending') {
      return base.map((s, i) => ({ ...s, active: i === 0 }));
    }
    if (order?.status === 'delivered' || order?.status === 'exchanged' || order?.status === 'returned') {
      return base.map((s, i) => ({ ...s, done: i < 2, active: i === 2 }));
    }
    return base.map((s, i) => ({ ...s, done: i === 0, active: i === 1 }));
  }, [order]);

  const etaText = useMemo(() => {
    if (order?.status === 'cancelled') return 'Đơn hàng đã bị hủy';
    if (order?.status === 'pending') return 'Chờ cửa hàng xác nhận đơn hàng';
    if (order?.status === 'hard_to_ship') return 'Chưa có tài xế nhận đơn — vui lòng gọi cửa hàng để được hỗ trợ';
    if (order?.status === 'customer_refused') return 'Khách không nhận đơn — vui lòng liên hệ cửa hàng';
    if (order?.status === 'exchanged') return 'Đơn đã đổi hàng thành công';
    if (order?.status === 'returned') return 'Đơn đã bị trả hàng';
    const s = live?.status || '';
    if (s === 'COMPLETED') return 'Đơn đã giao thành công';
    if (s === 'ASSIGNING' || !live?.driver) return 'Đang tìm tài xế gần nhất…';
    if (s === 'ACCEPTED') return 'Tài xế đang đến lấy hàng';
    if (s === 'IN PROCESS' && live.durationSec && (live.timestamps?.boarded || live.timestamps?.pickedUp)) {
      const start = live.timestamps?.boarded || live.timestamps?.pickedUp || 0;
      const remaining = Math.max(0, live.durationSec - (Date.now() / 1000 - start));
      const mins = Math.max(1, Math.round(remaining / 60));
      return `Tài xế sẽ đến trong khoảng ${mins} phút`;
    }
    return 'Đang cập nhật vị trí';
  }, [live, order]);

  const driverLabel = useMemo(() => {
    if (order?.status === 'hard_to_ship' || order?.status === 'customer_refused') {
      return { title: live?.driver?.name || 'Cửa hàng', sub: 'Gọi cửa hàng để được hỗ trợ' };
    }
    if (!live?.driver) return { title: 'Đang tìm tài xế…', sub: 'Xe máy giao nhanh trong nội thành' };
    const rating = live.driver.rating ? `⭐ ${live.driver.rating}` : '⭐ 5.0';
    return { title: live.driver.name || 'Tài xế', sub: `${rating} · Tài xế AhaMove` };
  }, [live, order]);

  const deliveryAddress = useMemo(() => {
    const addr = live?.delivery?.address || track?.addressSnapshot?.full || '';
    return addr || 'Đang cập nhật địa chỉ';
  }, [live, track]);

  const handleCall = useCallback(() => {
    const phone = live?.driver?.phone;
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`);
  }, [live]);

  const handleLiveMap = useCallback(() => {
    if (live?.shareLink) Linking.openURL(live.shareLink);
  }, [live]);

  const handleHome = useCallback(() => {
    useCartStore.getState().clearCart();
    useCheckoutStore.getState().reset();
    navigation.navigate('MainTabs');
  }, [navigation]);

  const handleReorder = useCallback(() => {
    if (!order?.items || order.items.length === 0) return;
    const cart = useCartStore.getState();
    cart.clearCart();
    order.items.forEach((it) => {
      const product: Product = {
        id: it.product_id,
        name: it.name,
        price: it.price ?? 0,
        unit: '1',
        shop: 'Hải Sản Hà Nội',
        rating: 0,
        distance: '',
        isFresh: false,
        isOutOfStock: false,
        imageBg: '',
        emoji: '',
        images: it.image ? [it.image] : undefined,
      };
      cart.addItem(product, it.variant, it.quantity, it.image);
    });
    navigation.navigate('Cart');
  }, [order, navigation]);

  const canReorder = useMemo(() => {
    return !!order && !!order.items && order.items.length > 0;
  }, [order]);

  const canCancel = useMemo(() => {
    if (!order) return false;
    if (!['pending', 'confirmed', 'hard_to_ship'].includes(order.status)) return false;
    if (track?.carrier) {
      const live = track.live;
      if (!live) return true;
      if (live.driver) return false;
      const s = live.status || '';
      return ['ASSIGNING', 'IDLE', 'CONFIRMING', 'PAYING', ''].includes(s);
    }
    return true;
  }, [order, track]);

  const handleCancel = useCallback(() => {
    if (!orderCode) return;
    Alert.alert(
      'Hủy đơn hàng',
      `Bạn có chắc muốn hủy đơn #${orderCode}? Đơn vận chuyển sẽ được hủy cùng lúc.`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy đơn',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const updated = await cancelOrder(orderCode, 'Khách hàng muốn hủy đơn');
              setOrder(updated);
              await loadTracking();
              Alert.alert('Đã hủy đơn', `Đơn hàng #${orderCode} đã được hủy.`);
            } catch (e: any) {
              Alert.alert('Hủy đơn thất bại', e.message || 'Vui lòng thử lại sau');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  }, [orderCode, loadTracking]);

  const hasMap = !!(mapData.pickup && mapData.delivery);

  return (
    <SafeAreaView style={commonStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.centerText}>Đang tải trạng thái đơn hàng…</Text>
        </View>
      ) : !orderCode || error ? (
        <View style={styles.center}>
          <Text style={styles.centerTitle}>Không có dữ liệu đơn hàng</Text>
          <Text style={styles.centerText}>{error || 'Vui lòng quay lại trang danh sách đơn hàng.'}</Text>
          {error && (
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setError(null); loadOrder(); loadTracking(); }}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.confirmBanner}>
            <View style={styles.confirmIcon}>
              <Text style={styles.confirmIconText}>✓</Text>
            </View>
            <View>
              <Text style={styles.confirmTitle}>
                {order?.status === 'cancelled' ? 'Đơn hàng đã hủy' : 'Đặt hàng thành công'}
              </Text>
              <Text style={styles.confirmCode}>Mã đơn #{orderCode}</Text>
            </View>
          </View>

          {hasMap ? (
            <View style={styles.mapWrap}>
              <WebView
                ref={webviewRef}
                source={{ html: mapHtml }}
                style={styles.map}
                originWhitelist={['*']}
                javaScriptEnabled
                scrollEnabled={false}
                onLoadEnd={() => {
                  const driver = computeDriver(track);
                  if (driver) {
                    webviewRef.current?.injectJavaScript(
                      `window.setDriver && window.setDriver(${driver.lat}, ${driver.lng}, ${driver.waiting});`,
                    );
                  }
                }}
              />
              {live?.shareLink ? (
                <TouchableOpacity style={styles.liveBadge} onPress={handleLiveMap}>
                  <Text style={styles.liveBadgeText}>● Xem bản đồ trực tiếp</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.mapFallback}>
              <View style={styles.mapRoute}>
                <View style={styles.mapPin}>
                  <Text style={styles.mapPinText}>🏬</Text>
                </View>
                <View style={styles.mapPath}>
                  <View style={styles.mapDriver}>
                    <Text style={styles.mapDriverText}>🛵</Text>
                  </View>
                </View>
                <View style={styles.mapPin}>
                  <Text style={styles.mapPinText}>🏠</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.etaBanner}>
            <Text style={styles.etaLabel}>
              {order?.status === 'cancelled' ? 'Trạng thái' : 'Tài xế sẽ đến trong khoảng'}
            </Text>
            <Text style={styles.etaValue}>{etaText}</Text>
          </View>

          <View style={styles.steps}>
            {steps.map((step, i) => (
              <View key={i} style={styles.step}>
                <View
                  style={[
                    styles.stepDot,
                    step.done && styles.stepDotDone,
                    step.active && !step.done && styles.stepDotActive,
                  ]}
                />
                <Text
                  style={[
                    styles.stepLabel,
                    (step.done || step.active) && styles.stepLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>🧑</Text>
            </View>
            <View style={styles.driverMid}>
              <Text style={styles.driverName}>{driverLabel.title}</Text>
              <Text style={styles.driverRating}>{driverLabel.sub}</Text>
            </View>
            <View style={styles.driverActions}>
              <TouchableOpacity style={styles.driverBtn} onPress={handleCall} disabled={!live?.driver?.phone}>
                <Text style={styles.driverBtnText}>📞</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.orderCard}>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Mã đơn hàng</Text>
              <Text style={styles.orderValue}>#{orderCode}</Text>
            </View>
            {track?.carrierTrackingCode ? (
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Mã vận chuyển</Text>
                <Text style={styles.orderValue}>{track.carrierTrackingCode}</Text>
              </View>
            ) : null}
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Tổng thanh toán</Text>
              <Text style={styles.orderValue}>{formatMoney(order?.total ?? 0)}</Text>
            </View>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Địa chỉ giao</Text>
              <Text style={[styles.orderValue, { maxWidth: 190, textAlign: 'right' }]}>{deliveryAddress}</Text>
            </View>
          </View>

          {order?.items && order.items.length > 0 ? (
            <View style={styles.itemsCard}>
              <Text style={styles.itemsTitle}>Chi tiết đơn hàng</Text>
              {order.items.map((it, i) => (
                <View key={it.product_id || i} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {it.name}
                      {it.variant ? ` (${it.variant})` : ''}
                    </Text>
                    <Text style={styles.itemQty}>Số lượng: {it.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>{formatMoney((it.price ?? 0) * it.quantity)}</Text>
                </View>
              ))}
              <View style={styles.totalsDivider} />
              {typeof order.subtotal === 'number' ? (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tạm tính</Text>
                  <Text style={styles.totalValue}>{formatMoney(order.subtotal)}</Text>
                </View>
              ) : null}
              {typeof order.discount === 'number' && order.discount > 0 ? (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Giảm giá</Text>
                  <Text style={[styles.totalValue, styles.totalDiscount]}>-{formatMoney(order.discount)}</Text>
                </View>
              ) : null}
              {typeof order.shippingFee === 'number' && order.shippingFee > 0 ? (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Phí giao hàng</Text>
                  <Text style={styles.totalValue}>{formatMoney(order.shippingFee)}</Text>
                </View>
              ) : null}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabelStrong}>Tổng cộng</Text>
                <Text style={styles.totalValueStrong}>{formatMoney(order.total ?? 0)}</Text>
              </View>
            </View>
          ) : null}

          {track?.timeline && track.timeline.length > 0 ? (
            <View style={styles.timeline}>
              <Text style={styles.timelineTitle}>Lịch sử đơn hàng</Text>
              {track.timeline.slice(0, 6).map((t, i) => (
                <View key={t.id || i} style={styles.timelineRow}>
                  <View style={[styles.timelineDot, i === 0 && styles.timelineDotLatest]} />
                  <Text style={[styles.timelineNote, i === 0 && { fontWeight: '700' }]}>{t.note}</Text>
                  <Text style={styles.timelineTime}>{new Date(t.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      <View style={styles.sticky}>
        {canCancel ? (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={cancelling}
          >
            <Text style={styles.cancelBtnText}>
              {cancelling ? 'Đang hủy đơn…' : 'Hủy đơn hàng'}
            </Text>
          </TouchableOpacity>
        ) : null}
        {canReorder ? (
          <TouchableOpacity style={styles.reorderBtn} onPress={handleReorder}>
            <Text style={styles.reorderBtnText}>🔄 Đặt lại</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.homeBtn} onPress={handleHome}>
          <Text style={styles.homeBtnText}>Về trang chủ</Text>
        </TouchableOpacity>
      </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 8 },
  centerTitle: { fontWeight: '800', color: colors.navy, fontSize: 15 },
  centerText: { color: colors.muted, fontSize: 12.5, textAlign: 'center' },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  retryBtnText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  confirmBanner: {
    backgroundColor: colors.mint,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confirmIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmIconText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  confirmTitle: { fontSize: 13, fontWeight: '800', color: colors.navy },
  confirmCode: { fontSize: 11, color: colors.muted, fontFamily: 'Inter' },
  mapWrap: {
    position: 'relative',
    height: 240,
    backgroundColor: colors.mint,
  },
  map: { flex: 1, backgroundColor: '#e8efe9' },
  liveBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.coral,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    zIndex: 10,
  },
  liveBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  mapFallback: {
    height: 180,
    backgroundColor: colors.mint,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  mapRoute: { flexDirection: 'row', alignItems: 'center' },
  mapPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  mapPinText: { fontSize: 18 },
  mapPath: {
    flex: 1,
    height: 3,
    marginHorizontal: 6,
    backgroundColor: colors.line,
    position: 'relative',
    overflow: 'visible',
  },
  mapDriver: { position: 'absolute', top: -16, left: '40%' },
  mapDriverText: { fontSize: 24 },
  etaBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: colors.mint,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etaLabel: { fontSize: 12, color: colors.muted },
  etaValue: { fontFamily: 'Inter', fontWeight: '800', color: colors.primary, fontSize: 16, maxWidth: 220, textAlign: 'right' },
  steps: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 4,
    justifyContent: 'space-between',
  },
  step: { flex: 1, alignItems: 'center' },
  stepDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: colors.line,
    marginBottom: 6,
    zIndex: 2,
  },
  stepDotDone: { backgroundColor: colors.primary },
  stepDotActive: {
    backgroundColor: colors.coral,
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  stepLabel: { fontSize: 10, color: colors.muted, textAlign: 'center' },
  stepLabelActive: { color: colors.navy, fontWeight: '700' },
  driverCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: { fontSize: 22 },
  driverMid: { flex: 1 },
  driverName: { fontWeight: '800', color: colors.navy, fontSize: 13.5 },
  driverRating: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  driverActions: { flexDirection: 'row', gap: 8 },
  driverBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverBtnText: { fontSize: 16 },
  orderCard: {
    marginHorizontal: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    padding: 14,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderLabel: { fontSize: 12.5, color: colors.muted },
  orderValue: { fontWeight: '800', color: colors.navy, fontFamily: 'Inter', fontSize: 12.5 },
  itemsCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    padding: 14,
  },
  itemsTitle: { fontWeight: '800', color: colors.navy, fontSize: 13, marginBottom: 10 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 12.5, color: colors.navy, fontWeight: '700' },
  itemQty: { fontSize: 11, color: colors.muted, marginTop: 2 },
  itemPrice: { fontWeight: '800', color: colors.navy, fontFamily: 'Inter', fontSize: 12.5 },
  totalsDivider: { height: 1, backgroundColor: colors.line, marginBottom: 10 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: { fontSize: 12.5, color: colors.muted },
  totalValue: { fontWeight: '700', color: colors.navy, fontFamily: 'Inter', fontSize: 12.5 },
  totalDiscount: { color: '#D64545' },
  totalLabelStrong: { fontWeight: '800', color: colors.navy, fontSize: 13 },
  totalValueStrong: { fontWeight: '800', color: colors.primary, fontFamily: 'Inter', fontSize: 14 },
  timeline: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    padding: 14,
  },
  timelineTitle: { fontWeight: '800', color: colors.navy, fontSize: 13, marginBottom: 10 },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
  },
  timelineDotLatest: { backgroundColor: colors.primary },
  timelineNote: { flex: 1, fontSize: 12, color: colors.navy },
  timelineTime: { fontSize: 11, color: colors.muted, fontFamily: 'Inter' },
  sticky: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 10,
  },
  cancelBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.6,
    borderColor: '#D64545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: '#D64545', fontWeight: '800', fontSize: 13.5 },
  reorderBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.6,
    borderColor: colors.primary,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderBtnText: { color: colors.primary, fontWeight: '800', fontSize: 13.5 },
  homeBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.6,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnText: { color: colors.primary, fontWeight: '800', fontSize: 13.5 },
});
