import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../constants/theme';
import { formatDateVN } from '../utils/format';
import { BackButton } from '../components/BackButton';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  data?: any;
  read: boolean;
  created_at: string;
}

interface NotificationsScreenProps {
  navigation: any;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const api = (await import('../services/api')).default;
      const res: any = await api.get('/notifications');
      setNotifications(res.data || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      const api = (await import('../services/api')).default;
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch {}
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      const api = (await import('../services/api')).default;
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }, []);

  const renderNotif = useCallback(({ item }: { item: NotificationItem }) => {
    const dateStr = item.created_at
      ? new Date(item.created_at).toLocaleDateString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        })
      : '';

    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.cardUnread]}
        onPress={() => handleMarkRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.dotWrap, item.read && styles.dotRead]}>
          <View style={[styles.dot, item.read && styles.dotInvisible]} />
        </View>
        <View style={styles.mid}>
          <Text style={[styles.notifTitle, !item.read && styles.titleBold]}>{item.title}</Text>
          <Text style={styles.bodyText} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleMarkRead]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={commonStyles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Thông báo</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Đọc tất cả</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotif}
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
  markAllText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  list: { padding: 16, gap: 8 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  cardUnread: {
    backgroundColor: colors.mint,
    borderColor: colors.primary + '40',
  },
  dotWrap: {
    width: 20,
    alignItems: 'center',
    paddingTop: 4,
  },
  dotRead: { alignItems: 'center' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  dotInvisible: { backgroundColor: 'transparent' },
  mid: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: colors.navy, marginBottom: 2 },
  titleBold: { fontWeight: '800' },
  bodyText: { fontSize: 12.5, color: colors.muted, lineHeight: 18 },
  date: { fontSize: 11, color: '#9AA7AB', marginTop: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12, opacity: 0.5 },
  emptyText: { fontSize: 14, color: colors.muted },
});
