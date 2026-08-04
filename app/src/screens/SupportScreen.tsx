import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../constants/theme';
import { BackButton } from '../components/BackButton';

interface SupportScreenProps {
  navigation: any;
}

const FAQ = [
  { q: 'Làm sao để đặt hàng?', a: 'Chọn sản phẩm, thêm vào giỏ hàng, chọn phương thức giao hàng & thanh toán, xác nhận đơn hàng.' },
  { q: 'Thời gian giao hàng bao lâu?', a: 'Nội thành Hà Nội: 1-3 giờ (hỏa tốc) hoặc hẹn giờ. Ngoại thành: 3-6 giờ.' },
  { q: 'Có được kiểm tra hàng không?', a: 'Có. Bạn được kiểm tra số lượng, chủng loại trước khi thanh toán.' },
  { q: 'Chính sách đổi trả?', a: 'Hải sản tươi sống không hỗ trợ đổi trả. Nếu sản phẩm không đạt chất lượng, vui lòng liên hệ hotline trong vòng 2 giờ.' },
  { q: 'Làm sao để hủy đơn?', a: 'Vào mục Đơn mua > chọn đơn > Hủy đơn. Chỉ hủy được khi đơn chưa vào bếp.' },
];

export const SupportScreen: React.FC<SupportScreenProps> = ({ navigation }) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  const callHotline = () => {
    Linking.openURL('tel:1900123456').catch(() =>
      Alert.alert('Không thể gọi', 'Vui lòng gọi 1900 123 456'),
    );
  };

  const openZalo = () => {
    Linking.openURL('https://zalo.me/1900123456').catch(() =>
      Alert.alert('Lỗi', 'Không thể mở Zalo'),
    );
  };

  return (
    <SafeAreaView style={commonStyles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Hỗ trợ</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>📞 Tổng đài hỗ trợ</Text>
          <Text style={styles.contactPhone}>1900 123 456</Text>
          <Text style={styles.contactHours}>7:00 - 22:00 • Tất cả các ngày</Text>
          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactBtn} onPress={callHotline}>
              <Text style={styles.contactBtnText}>📞 Gọi ngay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactBtn, styles.zaloBtn]} onPress={openZalo}>
              <Text style={styles.contactBtnText}>💬 Chat Zalo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📧 Email</Text>
          <Text style={styles.sectionText}>support@haisanhanoi.vn</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Văn phòng</Text>
          <Text style={styles.sectionText}>Số 12, ngõ 88 Trần Duy Hưng, Cầu Giấy, Hà Nội</Text>
        </View>

        <Text style={styles.faqTitle}>❓ Câu hỏi thường gặp</Text>

        {FAQ.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.faqItem, expanded === i && styles.faqItemOpen]}
            onPress={() => setExpanded(expanded === i ? null : i)}
            activeOpacity={0.7}
          >
            <View style={styles.faqHead}>
              <Text style={styles.faqQ}>{item.q}</Text>
              <Text style={styles.faqChev}>{expanded === i ? '▲' : '▼'}</Text>
            </View>
            {expanded === i && <Text style={styles.faqA}>{item.a}</Text>}
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  body: { padding: 16, gap: 16, paddingBottom: 40 },
  contactCard: {
    backgroundColor: colors.navy,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  contactTitle: { fontSize: 15, color: colors.white, fontWeight: '700', marginBottom: 4 },
  contactPhone: { fontSize: 22, fontWeight: '800', color: colors.coral, marginBottom: 2 },
  contactHours: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 16 },
  contactRow: { flexDirection: 'row', gap: 12 },
  contactBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zaloBtn: { backgroundColor: '#0068FF' },
  contactBtnText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.navy, marginBottom: 2 },
  sectionText: { fontSize: 13, color: colors.muted },
  faqTitle: { fontSize: 15, fontWeight: '800', color: colors.navy, marginTop: 4 },
  faqItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  faqItemOpen: { borderColor: colors.primary },
  faqHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQ: { fontSize: 13.5, fontWeight: '700', color: colors.navy, flex: 1 },
  faqChev: { fontSize: 11, color: colors.muted, marginLeft: 8 },
  faqA: { fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 8 },
});
