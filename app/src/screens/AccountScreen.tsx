import React, { useCallback, useEffect, useState } from 'react';
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
import { BottomNav } from '../components/BottomNav';
import { colors, radii, commonStyles } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { fetchOrders } from '../services/api';

interface AccountScreenProps {
  navigation: any;
}

const menuGroups = [
  [
    { icon: '📦', label: 'Đơn mua', route: 'OrderList' },
    { icon: '📍', label: 'Địa chỉ giao hàng', route: 'AddressList' },
    { icon: '💳', label: 'Phương thức thanh toán', route: 'PaymentMethods' },
    { icon: '🏷️', label: 'Ưu đãi của tôi', route: 'UserVouchers' },
  ],
  [
    { icon: '🔔', label: 'Thông báo', route: 'Notifications' },
    { icon: '💬', label: 'Chat hỗ trợ', route: 'Chat' },
    { icon: '❓', label: 'Hỗ trợ & FAQ', route: 'Support' },
  ],
];

export const AccountScreen: React.FC<AccountScreenProps> = ({ navigation }) => {
  const customer = useAuthStore((s) => s.customer);
  const logout = useAuthStore((s) => s.logout);
  const clearCart = useCartStore((s) => s.clearCart);
  const [orderCount, setOrderCount] = useState<number>(0);

  useEffect(() => {
    if (__DEV__) console.log('[Account] mounting...');
    // Don't fetch orders just for count - too slow for tab switch
    // Use a lightweight endpoint instead
    (async () => {
      try {
        const t1 = Date.now();
        const orders = await fetchOrders();
        if (__DEV__) console.log(`[Account] orders API: ${Date.now() - t1}ms, count=${orders.length}`);
        setOrderCount(orders.length);
      } catch (e: any) {
        if (__DEV__) console.log('[Account] error:', e.message);
      }
    })();
  }, []);

  const handleTabPress = useCallback(
    (tab: string) => {
      if (tab === 'account') return;
      const target = tab === 'home' ? 'Home' : tab === 'video' ? 'VideoTab' : 'OrdersTab';
      if (typeof navigation.jumpTo === 'function') {
        navigation.jumpTo(target);
      } else {
        navigation.navigate('MainTabs', { screen: target });
      }
    },
    [navigation],
  );

  const handleLogout = useCallback(() => {
    Alert.alert('Đăng xuất tài khoản?', 'Bạn sẽ cần đăng nhập lại để tiếp tục mua sắm.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => { clearCart(); logout(); },
      },
    ]);
  }, [logout, clearCart]);

  const name = customer?.name || '...';
  const phone = customer?.phone || '...';
  const tierLabels: Record<string, string> = {
    silver: 'Thành viên Biển Bạc',
    gold: 'Thành viên Biển Vàng',
    diamond: 'Thành viên Biển Kim Cương',
  };
  const tierLabel = customer?.tier ? (tierLabels[customer.tier] || '...') : '...';

  return (
    <SafeAreaView style={commonStyles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👩</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{name}</Text>
            <Text style={styles.profilePhone}>{phone}</Text>
            <View style={styles.tier}>
              <Text style={styles.tierText}>{tierLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statRow}>
          {[
            { num: String(orderCount), label: 'Đơn mua' },
            { num: '2', label: 'Mã ưu đãi' },
          ].map((stat, i) => (
            <TouchableOpacity key={i} style={styles.statCard}>
              <Text style={styles.statNum}>{stat.num}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {menuGroups.map((group, gi) => (
          <View key={gi} style={styles.menuGroup}>
            {group.map((item, i) => (
              <TouchableOpacity key={i} style={styles.menuItem} onPress={() => navigation.navigate(item.route)}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuChev}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
      <BottomNav active="account" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    margin: 16,
    borderRadius: radii.md,
    padding: 18,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24 },
  profileName: { fontWeight: '800', fontSize: 15, color: colors.white },
  profilePhone: { fontSize: 12, opacity: 0.85, color: colors.white, marginVertical: 2 },
  tier: {
    backgroundColor: colors.coral,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  tierText: { fontSize: 10.5, fontWeight: '800', color: colors.white },
  statRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    padding: 14,
    alignItems: 'center',
  },
  statNum: { fontFamily: 'Inter', fontWeight: '800', fontSize: 20, color: colors.primary },
  statLabel: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  menuGroup: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  menuIcon: { fontSize: 18, width: 22, textAlign: 'center' },
  menuLabel: { flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.navy },
  menuChev: { color: '#B7C3C6', fontSize: 14 },
  logoutBtn: {
    marginHorizontal: 16,
    marginBottom: 24,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F1B8A8',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: colors.danger, fontWeight: '800', fontSize: 13.5 },
});
