import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../constants/theme';
import { Order } from '../types';
import { fetchOrders } from '../services/api';
import { formatMoney } from '../utils/format';
import { BottomNav } from '../components/BottomNav';
import { mediaUrl } from '../utils/media';
import { MediaImage } from '../components/MediaImage';

interface OrderListScreenProps {
  navigation: any;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đang giao',
  hard_to_ship: 'Đang giao',
  customer_refused: 'Đang giao',
  delivered: 'Đã giao',
  exchanged: 'Đã giao',
  returned: 'Đã giao',
  cancelled: 'Đã hủy',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  hard_to_ship: '#3B82F6',
  customer_refused: '#3B82F6',
  delivered: '#10B981',
  exchanged: '#10B981',
  returned: '#10B981',
  cancelled: '#D64545',
};

export const OrderListScreen: React.FC<OrderListScreenProps> = ({ navigation }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const focused = useIsFocused();

  const loadOrders = useCallback(async (pull = false) => {
    if (__DEV__) console.log(`[Orders] loadOrders(pull=${pull})`);
    const t1 = Date.now();
    if (pull) setRefreshing(true);
    else if (!hasLoadedRef.current) setLoading(true);
    try {
      const data = await fetchOrders();
      if (__DEV__) console.log(`[Orders] API done in ${Date.now() - t1}ms: ${data.length} orders`);
      setOrders(data);
      hasLoadedRef.current = true;
    } catch (e: any) {
      if (__DEV__) console.log('[Orders] error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (focused) loadOrders();
  }, [focused, loadOrders]);

  const handleTabPress = useCallback(
    (tab: string) => {
      if (tab === 'orders') return;
      const target = tab === 'home' ? 'Home' : tab === 'video' ? 'VideoTab' : 'AccountTab';
      if (typeof navigation.jumpTo === 'function') {
        navigation.jumpTo(target);
      } else {
        navigation.navigate('MainTabs', { screen: target });
      }
    },
    [navigation],
  );

  const renderOrder = useCallback(({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('Tracking', { orderCode: item.code })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderCode} numberOfLines={1}>#{item.code}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status] || item.status}
          </Text>
        </View>
      </View>

      <View style={styles.itemsRow}>
        {item.items?.slice(0, 3).map((oi, i) => {
          const img = oi.image;
          const isData = img?.startsWith('data:');
          const isHttp = img?.startsWith('http');
          const imgUrl = isData ? img : isHttp ? img : mediaUrl(img);
          return (
            <View key={i} style={styles.itemThumb}>
              {imgUrl ? (
                <MediaImage uri={imgUrl} style={styles.itemImg} />
              ) : (
                <View style={[styles.itemImg, styles.itemImgDefault]}>
                  <Text style={{ fontSize: 22 }}>🦐</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
      {item.items?.slice(0, 2).map((oi, i) => (
        <Text key={i} style={styles.itemRow}>
          {oi.name} ({oi.variant}) x{oi.quantity}
        </Text>
      ))}
      {item.items && item.items.length > 2 && (
        <Text style={styles.moreText}>...và {item.items.length - 2} món khác</Text>
      )}

      <View style={styles.orderFooter}>
        <Text style={styles.total}>{formatMoney(item.total)}</Text>
        {item.createdAt && (
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
        )}
      </View>
    </TouchableOpacity>
  ), [navigation]);

  return (
    <SafeAreaView style={commonStyles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <Text style={styles.title}>Đơn mua</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
          <Text style={{ color: colors.muted, fontSize: 14 }}>Chưa có đơn hàng nào</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.code}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadOrders(true)} />
          }
        />
      )}

      <BottomNav active="orders" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.navy },
  list: { padding: 16, gap: 12 },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  orderCode: { fontWeight: '700', fontSize: 14, color: colors.navy, flexShrink: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '700' },
  itemRow: { fontSize: 13, color: colors.muted, marginBottom: 2 },
  itemsRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  itemThumb: { borderRadius: 8, overflow: 'hidden' },
  itemImg: { width: 48, height: 48, borderRadius: 8 },
  itemImgDefault: { backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 12, color: colors.muted, fontStyle: 'italic', marginTop: 2 },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  total: { fontWeight: '800', fontSize: 15, color: colors.navy },
  date: { fontSize: 12, color: colors.muted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
