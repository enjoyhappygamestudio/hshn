import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, commonStyles } from '../constants/theme';
import { Product } from '../types';
import { fetchProducts } from '../services/api';
import { formatMoney } from '../utils/format';
import { BackButton } from '../components/BackButton';
import { MediaImage } from '../components/MediaImage';
import { mediaUrl } from '../utils/media';

interface SearchScreenProps {
  navigation: any;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
    (async () => {
      try {
        const prods = await fetchProducts();
        setAllProducts(prods);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      const q = query.toLowerCase().trim();
      const filtered = allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          p.shop.toLowerCase().includes(q),
      );
      setResults(filtered);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, allProducts]);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => {
      const img = item.images?.[0];
      return (
        <TouchableOpacity
          style={styles.resultItem}
          activeOpacity={0.7}
          onPress={() => {
            Keyboard.dismiss();
            navigation.navigate('ProductDetail', { productId: item.id });
          }}
        >
          <View style={[styles.thumb, { backgroundColor: item.imageBg || colors.mint }]}>
            {img ? (
              <MediaImage uri={mediaUrl(img) || img} style={styles.thumbImg} />
            ) : (
              <Text style={styles.thumbEmoji}>{item.emoji}</Text>
            )}
          </View>
          <View style={styles.info}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemShop} numberOfLines={1}>🏪 {item.shop}</Text>
            <Text style={styles.itemPrice}>{formatMoney(item.price)} / {item.unit}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation],
  );

  return (
    <SafeAreaView style={commonStyles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Tìm tôm, cá, mực..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.length > 0 && !loading ? (
            <Text style={styles.empty}>Không tìm thấy sản phẩm</Text>
          ) : query.length === 0 ? (
            <Text style={styles.empty}>Nhập từ khóa để tìm kiếm</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.navy,
    padding: 0,
  },
  clearBtn: { fontSize: 14, color: colors.muted, padding: 4 },
  list: { padding: 12 },
  resultItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { width: 56, height: 56, borderRadius: 12 },
  thumbEmoji: { fontSize: 26 },
  info: { flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 13.5, fontWeight: '700', color: colors.navy },
  itemShop: { fontSize: 11, color: colors.muted, marginTop: 2 },
  itemPrice: { fontFamily: fonts.numeric, fontWeight: '700', fontSize: 13, color: colors.coral, marginTop: 3 },
  empty: { textAlign: 'center', color: colors.muted, fontSize: 13, marginTop: 40 },
});
