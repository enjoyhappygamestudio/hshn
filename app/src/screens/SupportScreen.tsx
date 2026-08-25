import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../constants/theme';
import { BackButton } from '../components/BackButton';
import { fetchSupport } from '../services/api';

interface SupportScreenProps {
  navigation: any;
}

const FALLBACK = {
  hotline_display: '1900 123 456',
  hotline_tel: '1900123456',
  hours: '7:00 - 22:00 • Tất cả các ngày',
  zalo_url: 'https://zalo.me/1900123456',
  email: 'support@haisanhanoi.vn',
  office_address: 'Số 12, ngõ 88 Trần Duy Hưng, Cầu Giấy, Hà Nội',
  faqs: [
    { id: '1', question: 'Làm sao để đặt hàng?', answer: 'Chọn sản phẩm, thêm vào giỏ hàng, chọn phương thức giao hàng & thanh toán, xác nhận đơn hàng.' },
    { id: '2', question: 'Thời gian giao hàng bao lâu?', answer: 'Nội thành Hà Nội: 1-3 giờ (hỏa tốc) hoặc hẹn giờ. Ngoại thành: 3-6 giờ.' },
    { id: '3', question: 'Có được kiểm tra hàng không?', answer: 'Có. Bạn được kiểm tra số lượng, chủng loại trước khi thanh toán.' },
    { id: '4', question: 'Chính sách đổi trả?', answer: 'Hải sản tươi sống không hỗ trợ đổi trả. Nếu sản phẩm không đạt chất lượng, vui lòng liên hệ hotline trong vòng 2 giờ.' },
    { id: '5', question: 'Làm sao để hủy đơn?', answer: 'Vào mục Đơn mua > chọn đơn > Hủy đơn. Chỉ hủy được khi đơn chưa vào bếp.' },
  ],
};

export const SupportScreen: React.FC<SupportScreenProps> = ({ navigation }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(FALLBACK);

  const load = useCallback(async () => {
    try {
      const res = await fetchSupport();
      setData({
        hotline_display: res.hotline_display || FALLBACK.hotline_display,
        hotline_tel: res.hotline_tel || FALLBACK.hotline_tel,
        hours: res.hours || FALLBACK.hours,
        zalo_url: res.zalo_url || FALLBACK.zalo_url,
        email: res.email || FALLBACK.email,
        office_address: res.office_address || FALLBACK.office_address,
        faqs: (res.faqs || []).map((f) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
        })),
      });
    } catch {
      setData(FALLBACK);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const callHotline = () => {
    const tel = (data.hotline_tel || data.hotline_display).replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${tel}`).catch(() =>
      Alert.alert('Không thể gọi', `Vui lòng gọi ${data.hotline_display}`),
    );
  };

  const openZalo = () => {
    Linking.openURL(data.zalo_url).catch(() =>
      Alert.alert('Lỗi', 'Không thể mở Zalo'),
    );
  };

  const openEmail = () => {
    Linking.openURL(`mailto:${data.email}`).catch(() =>
      Alert.alert('Lỗi', `Vui lòng gửi email tới ${data.email}`),
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

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>📞 Tổng đài hỗ trợ</Text>
          <Text style={styles.contactPhone}>{data.hotline_display}</Text>
          <Text style={styles.contactHours}>{data.hours}</Text>
          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactBtn} onPress={callHotline}>
              <Text style={styles.contactBtnText}>📞 Gọi ngay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactBtn, styles.zaloBtn]} onPress={openZalo}>
              <Text style={styles.contactBtnText}>💬 Chat Zalo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.section} onPress={openEmail} activeOpacity={0.8}>
          <Text style={styles.sectionTitle}>📧 Email</Text>
          <Text style={styles.sectionText}>{data.email}</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Văn phòng</Text>
          <Text style={styles.sectionText}>{data.office_address}</Text>
        </View>

        {data.faqs.length > 0 && (
          <Text style={styles.faqTitle}>❓ Câu hỏi thường gặp</Text>
        )}

        {data.faqs.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.faqItem, expanded === item.id && styles.faqItemOpen]}
            onPress={() => setExpanded(expanded === item.id ? null : item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.faqHead}>
              <Text style={styles.faqQ}>{item.question}</Text>
              <Text style={styles.faqChev}>{expanded === item.id ? '▲' : '▼'}</Text>
            </View>
            {expanded === item.id && <Text style={styles.faqA}>{item.answer}</Text>}
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
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
