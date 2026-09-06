import React, { useState, useCallback, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';
import { WebView } from 'react-native-webview';
import { BackButton } from '../components/BackButton';
import { geocodeAddress, searchAddressSuggestions, AddressSuggestion } from '../utils/geocode';
import { addressMapHtml, WEBVIEW_MAP_PROPS } from '../utils/leafletMap';

const HANOI_DEFAULT = { latitude: 21.0278, longitude: 105.8342 };

interface AddressScreenProps {
  navigation: any;
}

export const AddressScreen: React.FC<AddressScreenProps> = ({ navigation }) => {
  const customer = useAuthStore((s) => s.customer);
  const updateCustomer = useAuthStore((s) => s.updateCustomer);
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [region, setRegion] = useState(HANOI_DEFAULT);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'found' | 'failed'>('idle');
  const [mapKey, setMapKey] = useState(0);
  const reqRef = useRef(0);
  const skipGeocodeRef = useRef(false);

  const handleAddressChange = useCallback((text: string) => {
    setAddress(text);
    setGeoStatus('idle');
    const q = text.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearching(false);
      return;
    }
    const reqId = ++reqRef.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchAddressSuggestions(q);
      if (reqId !== reqRef.current) return;
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const applySuggestion = useCallback((sug: AddressSuggestion) => {
    skipGeocodeRef.current = true;
    setAddress(sug.full);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearching(false);
    setRegion({ latitude: sug.lat, longitude: sug.lng });
    setMapKey((k) => k + 1);
    setGeoStatus('found');
  }, []);

  useEffect(() => {
    const addr = address.trim();
    if (addr.length < 8) return;
    if (skipGeocodeRef.current) {
      skipGeocodeRef.current = false;
      return;
    }
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
  }, [address]);

  const handleSave = useCallback(async () => {
    if (!address.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ giao hàng.');
      return;
    }
    if (geoStatus === 'failed') {
      Alert.alert(
        'Chưa xác định được vị trí',
        'Không tìm thấy vị trí của địa chỉ trên bản đồ. Vui lòng chọn một địa chỉ từ danh sách gợi ý.',
      );
      return;
    }
    try {
      await updateCustomer({ name, phone, address: address.trim() });
      Alert.alert('Đã lưu', 'Địa chỉ giao hàng đã được cập nhật');
      navigation.goBack();
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu địa chỉ');
    }
  }, [name, phone, address, geoStatus, updateCustomer, navigation]);

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
          <Text style={styles.label}>Địa chỉ giao hàng</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={handleAddressChange}
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="VD: Số 12, Ngõ 88 Trần Duy Hưng, Cầu Giấy, Hà Nội"
              placeholderTextColor={colors.muted}
              autoCorrect={false}
            />
            {searching && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.inputSpinner}
              />
            )}
          </View>
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestWrap}>
              <ScrollView style={styles.suggestList} keyboardShouldPersistTaps="handled">
                {suggestions.map((sug, index) => (
                  <TouchableOpacity
                    key={sug.id}
                    style={[styles.suggestItem, index > 0 && styles.suggestItemBorder]}
                    onPress={() => applySuggestion(sug)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestName} numberOfLines={1}>
                      📍 {sug.name}
                    </Text>
                    <Text style={styles.suggestFull} numberOfLines={2}>
                      {sug.full}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
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
              ✕ Không xác định được vị trí. Vui lòng chọn địa chỉ từ danh sách gợi ý.
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
          <Text style={styles.addressPreview}>{address}</Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>Lưu</Text>
        </TouchableOpacity>
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
  },
  inputWrap: { position: 'relative' },
  inputSpinner: { position: 'absolute', right: 12, top: 14 },
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
  suggestList: { maxHeight: 240 },
  suggestItem: { paddingHorizontal: 12, paddingVertical: 10 },
  suggestItemBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  suggestName: { fontSize: 13, fontWeight: '700', color: colors.navy },
  suggestFull: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 16 },
});