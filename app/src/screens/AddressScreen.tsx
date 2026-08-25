import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';
import { WebView } from 'react-native-webview';
import { BackButton } from '../components/BackButton';
import { geocodeAddress } from '../utils/geocode';
import { HANOI_DISTRICTS, HANOI_STREETS, HANOI_STREETS_NORM, HanoiDistrict } from '../data/hanoi';
import { normalizeVietnamese } from '../utils/geocode';
import { addressMapHtml, WEBVIEW_MAP_PROPS } from '../utils/leafletMap';

const HANOI_DEFAULT = { latitude: 21.0278, longitude: 105.8342 };

function parseSavedAddress(saved: string): {
  district: HanoiDistrict | null;
  ward: string;
  street: string;
} {
  const parts = saved
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2 || !/Hà Nội|Ha Noi/i.test(parts[parts.length - 1])) {
    return { district: null, ward: '', street: saved };
  }
  const rest = parts.slice(0, -1);
  if (rest.length === 0) return { district: null, ward: '', street: saved };
  const districtName = rest[rest.length - 1];
  const district =
    HANOI_DISTRICTS.find(
      (d) => d.name === districtName || d.name.replace(/^(Quận|Huyện)\s/, '') === districtName,
    ) || null;
  let ward = '';
  let street = '';
  if (rest.length >= 2) {
    ward = rest[rest.length - 2];
    street = rest.slice(0, -2).join(', ');
  } else {
    street = rest[0];
  }
  return { district, ward, street };
}

interface PickerModalProps {
  visible: boolean;
  title: string;
  items: string[];
  selected?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const PickerModal: React.FC<PickerModalProps> = ({ visible, title, items, selected, onSelect, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
            {items.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.modalItem, selected === item && styles.modalItemSelected]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text
                  style={[styles.modalItemText, selected === item && styles.modalItemTextSelected]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

interface AddressScreenProps {
  navigation: any;
}

export const AddressScreen: React.FC<AddressScreenProps> = ({ navigation }) => {
  const customer = useAuthStore((s) => s.customer);
  const updateCustomer = useAuthStore((s) => s.updateCustomer);
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [ward, setWard] = useState('');
  const [district, setDistrict] = useState<HanoiDistrict | null>(null);
  const [districtModal, setDistrictModal] = useState(false);
  const [wardModal, setWardModal] = useState(false);
  const [streetSugg, setStreetSugg] = useState<string[]>([]);
  const [showStreetSugg, setShowStreetSugg] = useState(false);
  const [region, setRegion] = useState(HANOI_DEFAULT);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'found' | 'failed'>('idle');
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    const saved = customer?.address || '';
    if (saved.trim()) {
      const parsed = parseSavedAddress(saved);
      setDistrict(parsed.district);
      setWard(parsed.ward);
      setStreet(parsed.street);
      if (parsed.district && parsed.ward) {
        const m = parsed.street.match(/^(\d+[A-Za-z]?)\s*(.*)$/);
        if (m && m[1]) {
          setHouseNumber(m[1]);
          setStreet(m[2].trim());
        }
      }
    }
  }, [customer?.address]);

  const composedAddress = useMemo(() => {
    const parts: string[] = [];
    if (houseNumber.trim()) parts.push(houseNumber.trim());
    if (street.trim()) parts.push(street.trim());
    if (ward) parts.push(ward);
    if (district) parts.push(district.name);
    parts.push('Hà Nội');
    return parts.join(', ');
  }, [houseNumber, street, ward, district]);

  const handleStreetChange = useCallback((text: string) => {
    setStreet(text);
    setGeoStatus('idle');
    const q = normalizeVietnamese(text.trim());
    if (q.length >= 2) {
      const starts = HANOI_STREETS.filter((_, i) => HANOI_STREETS_NORM[i].startsWith(q)).slice(0, 8);
      const includes = HANOI_STREETS.filter(
        (_, i) => HANOI_STREETS_NORM[i].includes(q) && !HANOI_STREETS_NORM[i].startsWith(q),
      ).slice(0, 4);
      setStreetSugg([...starts, ...includes].slice(0, 8));
      setShowStreetSugg(true);
    } else {
      setStreetSugg([]);
      setShowStreetSugg(false);
    }
  }, []);

  const applyStreetSugg = useCallback((value: string) => {
    setStreet(value);
    setStreetSugg([]);
    setShowStreetSugg(false);
    setGeoStatus('idle');
  }, []);

  useEffect(() => {
    const addr = composedAddress;
    if (addr.trim().length < 8) return;
    const timer = setTimeout(async () => {
      setGeoStatus('loading');
      const point = await geocodeAddress(addr);
      if (point) {
        setRegion({ latitude: point.lat, longitude: point.lng });
        setMapKey((k) => k + 1);
        setGeoStatus('found');
      } else {
        setGeoStatus('failed');
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [composedAddress]);

  const handleSave = useCallback(async () => {
    if (!district || !ward || !street.trim()) {
      Alert.alert(
        'Thiếu thông tin',
        'Vui lòng chọn đầy đủ Quận/Huyện, Phường/Xã và nhập Đường/Phố, Số nhà.',
      );
      return;
    }
    if (geoStatus === 'failed') {
      Alert.alert(
        'Chưa xác định được vị trí',
        'Không tìm thấy vị trí của địa chỉ trên bản đồ. Vui lòng kiểm tra lại Số nhà, Đường/Phố, Phường/Xã, Quận/Huyện.',
      );
      return;
    }
    try {
      await updateCustomer({ name, phone, address: composedAddress });
      Alert.alert('Đã lưu', 'Địa chỉ giao hàng đã được cập nhật');
      navigation.goBack();
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu địa chỉ');
    }
  }, [name, phone, district, ward, street, geoStatus, composedAddress, updateCustomer, navigation]);

  const wardItems = useMemo(
    () => (district ? district.wards : []),
    [district],
  );

  return (
    <SafeAreaView style={commonStyles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Địa chỉ giao hàng</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Họ tên người nhận</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Thành phố</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.inputText}>Hà Nội</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Quận / Huyện</Text>
          <TouchableOpacity
            style={[styles.input, styles.inputPressable]}
            onPress={() => setDistrictModal(true)}
          >
            <Text style={[styles.inputText, !district && styles.inputPlaceholder]}>
              {district ? district.name : 'Chọn quận / huyện'}
            </Text>
            <Text style={styles.inputChevron}>▾</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phường / Xã</Text>
          <TouchableOpacity
            style={[styles.input, styles.inputPressable, !district && styles.inputDisabled]}
            disabled={!district}
            onPress={() => setWardModal(true)}
          >
            <Text style={[styles.inputText, !ward && styles.inputPlaceholder]}>
              {ward ? ward : district ? 'Chọn phường / xã' : 'Chọn quận / huyện trước'}
            </Text>
            <Text style={styles.inputChevron}>▾</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Đường / Phố</Text>
          <TextInput
            style={styles.input}
            value={street}
            onChangeText={handleStreetChange}
            onFocus={() => setShowStreetSugg(streetSugg.length > 0)}
            onBlur={() => setTimeout(() => setShowStreetSugg(false), 150)}
            placeholder="VD: Ngõ 88 Trần Duy Hưng"
            placeholderTextColor={colors.muted}
          />
          {showStreetSugg && streetSugg.length > 0 && (
            <View style={styles.suggestWrap}>
              <ScrollView style={styles.suggestList} keyboardShouldPersistTaps="handled">
                {streetSugg.map((sug, index) => (
                  <TouchableOpacity
                    key={sug}
                    style={[styles.suggestItem, index > 0 && styles.suggestItemBorder]}
                    onPress={() => applyStreetSugg(sug)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestName} numberOfLines={1}>
                      📍 {sug}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Số nhà</Text>
          <TextInput
            style={styles.input}
            value={houseNumber}
            onChangeText={(t) => {
              setHouseNumber(t);
              setGeoStatus('idle');
            }}
            placeholder="VD: Số 12, ngõ ... (nếu có)"
            placeholderTextColor={colors.muted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Vị trí trên bản đồ</Text>
          <View style={styles.mapWrap}>
            {geoStatus === 'loading' ? (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.mapLoadingText}>Đang tìm vị trí địa chỉ...</Text>
              </View>
            ) : (
              <WebView
                key={mapKey}
                source={{ html: addressMapHtml(region.latitude, region.longitude) }}
                style={styles.map}
                scrollEnabled={false}
                {...WEBVIEW_MAP_PROPS}
              />
            )}
          </View>
          {geoStatus === 'found' && (
            <Text style={[styles.mapStatus, { color: colors.primary }]}>
              ✓ Đã xác định vị trí trên bản đồ
            </Text>
          )}
          {geoStatus === 'failed' && (
            <Text style={[styles.mapStatus, { color: colors.danger }]}>
              ✕ Không xác định được vị trí. Vui lòng kiểm tra lại các thông tin trên.
            </Text>
          )}
          {geoStatus === 'idle' && (
            <Text style={[styles.mapStatus, { color: colors.muted }]}>
              Đang chờ nhập địa chỉ để xác định vị trí trên bản đồ...
            </Text>
          )}
          <Text style={styles.mapCoord}>
            📍 {region.latitude.toFixed(5)}, {region.longitude.toFixed(5)}
          </Text>
          <Text style={styles.addressPreview}>{composedAddress}</Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>Lưu</Text>
        </TouchableOpacity>
      </ScrollView>

      <PickerModal
        visible={districtModal}
        title="Chọn Quận / Huyện"
        items={HANOI_DISTRICTS.map((d) => d.name)}
        selected={district?.name}
        onSelect={(value) => {
          const d = HANOI_DISTRICTS.find((x) => x.name === value) || null;
          setDistrict(d);
          setWard('');
          setGeoStatus('idle');
        }}
        onClose={() => setDistrictModal(false)}
      />
      <PickerModal
        visible={wardModal}
        title={`Chọn Phường / Xã - ${district?.name || ''}`}
        items={wardItems}
        selected={ward}
        onSelect={(value) => {
          setWard(value);
          setGeoStatus('idle');
        }}
        onClose={() => setWardModal(false)}
      />
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
  form: { padding: 20, gap: 14 },
  field: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.navy },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputDisabled: { opacity: 0.5 },
  inputPressable: { backgroundColor: colors.white },
  inputText: { flex: 1, fontSize: 14, color: colors.navy },
  inputPlaceholder: { color: colors.muted },
  inputChevron: { fontSize: 14, color: colors.muted, marginLeft: 8 },
  mapWrap: {
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.line,
    marginTop: 6,
  },
  map: { width: '100%', height: '100%' },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  mapLoadingText: { fontSize: 12, color: colors.muted, marginTop: 8 },
  mapStatus: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  mapCoord: { fontSize: 11, color: colors.muted, marginTop: 4 },
  addressPreview: { fontSize: 11, color: colors.navy, marginTop: 4, lineHeight: 15 },
  saveBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  suggestWrap: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  suggestList: { maxHeight: 220 },
  suggestItem: { paddingHorizontal: 12, paddingVertical: 10 },
  suggestItemBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  suggestName: { fontSize: 13, fontWeight: '600', color: colors.navy },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingBottom: 24,
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
    paddingBottom: 12,
  },
  modalList: { maxHeight: '70%' },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  modalItemSelected: { backgroundColor: colors.mint },
  modalItemText: { fontSize: 14, color: colors.navy },
  modalItemTextSelected: { color: colors.primary, fontWeight: '700' },
  modalClose: {
    marginTop: 12,
    marginHorizontal: 20,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
