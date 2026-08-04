import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../constants/theme';
import { BackButton } from '../components/BackButton';

const PAYMENT_METHODS = [
  {
    id: 'cod',
    icon: '💵',
    title: 'Thanh toán khi nhận hàng (COD)',
    desc: 'Bạn chỉ thanh toán khi nhận được hàng. Nhân viên giao hàng sẽ thu tiền mặt hoặc quét mã QR.',
    pros: ['Không cần thẻ ngân hàng', 'An toàn, chỉ trả tiền khi nhận đủ hàng'],
  },
  {
    id: 'wallet',
    icon: '📱',
    title: 'Ví điện tử',
    desc: 'Thanh toán qua Momo, ZaloPay, VNPay. Quét mã QR nhanh chóng và an toàn.',
    pros: ['Thanh toán nhanh 3 giây', 'Nhiều ưu đãi hoàn tiền', 'Hoàn toàn bảo mật'],
  },
  {
    id: 'card',
    icon: '💳',
    title: 'Thẻ ngân hàng',
    desc: 'Thanh toán qua thẻ nội địa hoặc thẻ quốc tế (Visa, Mastercard) được bảo mật chuẩn 3D Secure.',
    pros: ['Chấp nhận mọi loại thẻ', 'Bảo mật 3D Secure', 'Hoàn tiền theo chương trình của ngân hàng'],
  },
];

interface PaymentMethodsScreenProps {
  navigation: any;
}

export const PaymentMethodsScreen: React.FC<PaymentMethodsScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={commonStyles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Phương thức thanh toán</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {PAYMENT_METHODS.map((pm) => (
          <View key={pm.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardIcon}>{pm.icon}</Text>
              <Text style={styles.cardTitle}>{pm.title}</Text>
            </View>
            <Text style={styles.cardDesc}>{pm.desc}</Text>
            {pm.pros.map((pro, i) => (
              <View key={i} style={styles.proRow}>
                <Text style={styles.proDot}>•</Text>
                <Text style={styles.proText}>{pro}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.note}>
          <Text style={styles.noteTitle}>🔒 Cam kết bảo mật</Text>
          <Text style={styles.noteText}>
            Mọi giao dịch đều được mã hóa và bảo vệ. MEH Seafood không lưu trữ thông tin thẻ của bạn.
          </Text>
        </View>
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
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.navy, flex: 1 },
  cardDesc: { fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 8 },
  proRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  proDot: { color: colors.primary, fontSize: 13, width: 12 },
  proText: { fontSize: 12.5, color: colors.navy, flex: 1 },
  note: {
    backgroundColor: colors.mint,
    borderRadius: 14,
    padding: 16,
  },
  noteTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  noteText: { fontSize: 12.5, color: colors.navy, lineHeight: 18 },
});
