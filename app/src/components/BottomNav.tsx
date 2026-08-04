import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

interface BottomNavProps {
  active: 'home' | 'video' | 'orders' | 'account';
  onTabPress: (tab: string) => void;
}

const tabs = [
  { id: 'home', icon: '🏠', label: 'Trang chủ' },
  { id: 'video', icon: '🎬', label: 'Video' },
  { id: 'orders', icon: '🧾', label: 'Đơn hàng' },
  { id: 'account', icon: '👤', label: 'Tài khoản' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ active, onTabPress }) => {
  const lastPressRef = useRef(0);

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.item}
          onPress={() => {
            const now = Date.now();
            if (now - lastPressRef.current < 300) return;
            lastPressRef.current = now;
            if (__DEV__) console.log(`[BottomNav] tab press: ${tab.id} at ${now}`);
            onTabPress(tab.id);
          }}
        >
          <Text
            style={[styles.icon, active === tab.id && styles.iconActive]}
          >
            {tab.icon}
          </Text>
          <Text style={[styles.label, active === tab.id && styles.labelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  icon: { fontSize: 19, lineHeight: 22, opacity: 0.6 },
  iconActive: { opacity: 1 },
  label: { fontSize: 10.5, fontWeight: '700', color: '#9AA7AB' },
  labelActive: { color: colors.primary },
});
