import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductCard } from '../components/ProductCard';
import { BottomNav } from '../components/BottomNav';
import { HomeSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { colors, radii, shadows, fonts, commonStyles } from '../constants/theme';
import { Product, Category, FeaturedVideo } from '../types';
import { fetchProducts, fetchCategories, fetchFeaturedVideos, recordVideoView } from '../services/api';
import { mediaUrl } from '../utils/media';
import { formatMoney } from '../utils/format';

const { width: SCREEN_W } = Dimensions.get('window');
const VIDEO_CARD_W = (SCREEN_W - 14 * 2 - 8 * 1) / 2;

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredVideos, setFeaturedVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const cartCount = useCartStore((s) => s.count());
  const customer = useAuthStore((s) => s.customer);
  const deliveryLocation = customer?.address?.split(',').pop()?.trim() || '';

  const loadData = useCallback(async () => {
    setHasError(false);
    setIsLoading(true);
    try {
      const t1 = Date.now();
      // Videos are supplementary — a failure there must not blank out the catalogue.
      const [prods, cats, videos] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchFeaturedVideos().catch((e: any) => {
          if (__DEV__) console.log('[Home] videos unavailable:', e.message);
          return [] as any[];
        }),
      ]);
      if (__DEV__) console.log(`[Home] API done in ${Date.now() - t1}ms: ${prods.length} products, ${cats.length} categories, ${videos.length} videos`);
      setProducts(prods);
      setCategories(cats);
      setFeaturedVideos(videos);
      setHasError(false);
    } catch (e: any) {
      if (__DEV__) console.log('[Home] error:', e.message);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (__DEV__) console.log('[Home] mounting...');
    loadData();
  }, [loadData]);

  const handleProductPress = useCallback(
    (id: string) => navigation.navigate('ProductDetail', { productId: id }),
    [navigation],
  );

  const handleAddToCart = useCallback(
    (product: Product) => {
      useCartStore.getState().addItem(product, '1 phần', 1, product.images?.[0] || '');
    },
    [],
  );

  const handleTabPress = useCallback(
    (tab: string) => {
      if (tab === 'home') return;
      if (__DEV__) console.log(`[Home] tabPress → jumpTo(${tab}) at ${Date.now()}`);
      const target = tab === 'video' ? 'VideoTab' : tab === 'orders' ? 'OrdersTab' : 'AccountTab';
      if (typeof navigation.jumpTo === 'function') {
        navigation.jumpTo(target);
      } else {
        navigation.navigate('MainTabs', { screen: target });
      }
    },
    [navigation],
  );

  const handleRefresh = useCallback(() => {
    loadData();
  }, [loadData]);

  const productsByCategory = useCallback(() => {
    const map: Record<string, { category: Category; products: Product[] }> = {};
    const catMap: Record<string, Category> = {};
    categories.forEach((c) => { catMap[c.id] = c; });
    products.forEach((p) => {
      if (p.isOutOfStock) return;
      const catId = p.categoryId || 'other';
      if (!map[catId]) map[catId] = { category: catMap[catId] || { id: catId, name: 'Khác', icon: '📦' }, products: [] };
      map[catId].products.push(p);
    });
    return Object.values(map);
  }, [products, categories]);

  if (isLoading) {
    return (
      <SafeAreaView style={commonStyles.screen}>
        <HomeSkeleton />
      </SafeAreaView>
    );
  }

  if (hasError) {
    return (
      <SafeAreaView style={commonStyles.screen}>
        <ErrorState onRetry={handleRefresh} />
      </SafeAreaView>
    );
  }

  const catSections = productsByCategory();

  return (
    <SafeAreaView style={commonStyles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.topRow}>
            <Text style={styles.brand}>
              HẢI SẢN <Text style={styles.brandDot}>HÀ NỘI</Text>
            </Text>
            <View style={styles.topActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
                <Text style={styles.iconBtnText}>🔔</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('Cart')}
              >
                <Text style={styles.iconBtnText}>🛒</Text>
                {cartCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cartCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.deliverRow}>
            <Text style={styles.deliverText}>
              📍 Giao đến: <Text style={styles.deliverBold}>{deliveryLocation || '...'}</Text> ▾
            </Text>
          </View>
          <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Search')}>
            <Text style={styles.searchText}>🔍 Tìm tôm, cá, mực...</Text>
          </TouchableOpacity>
        </View>

        {featuredVideos.length > 0 && (
          <View style={styles.videoSection}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Video</Text>
              <TouchableOpacity onPress={() => navigation.navigate('VideoFeed', { videos: featuredVideos })}>
                <Text style={styles.sectionLink}>Xem tất cả video</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.videoHScroll}
            >
              {featuredVideos.slice(0, 2).map((video, idx) => {
                const vidUrl = mediaUrl(video.url) || '';
                const thumbUrl = mediaUrl(video.thumbnail_url);
                return (
                  <TouchableOpacity
                    key={video.id}
                    style={styles.videoHCard}
                    activeOpacity={0.9}
                    onPress={() => {
                      recordVideoView(video.id);
                      navigation.navigate('VideoPlayer', { video, allVideos: featuredVideos, currentIndex: featuredVideos.indexOf(video) });
                    }}
                  >
                    <View style={styles.videoHThumbWrap}>
                      {idx === 0 ? (
                        <Video
                          source={{ uri: vidUrl }}
                          style={styles.videoHThumb}
                          resizeMode={ResizeMode.COVER}
                          shouldPlay
                          isMuted
                          isLooping
                        />
                      ) : thumbUrl ? (
                        <Image source={{ uri: thumbUrl }} style={styles.videoHThumb} />
                      ) : (
                        <View style={[styles.videoHThumb, { backgroundColor: video.product_image_bg || '#DCEFEC', justifyContent: 'center', alignItems: 'center' }]}>
                          <Text style={{ fontSize: 28 }}>{video.product_emoji || '🎬'}</Text>
                        </View>
                      )}
                      <View style={styles.videoHPlayOverlay}>
                        <Text style={styles.videoHPlayBtn}>▶</Text>
                      </View>
                      <View style={styles.videoHViews}>
                        <Text style={styles.videoHViewsText}>👁️ {video.views}</Text>
                      </View>
                    </View>
                    <View style={styles.videoHInfo}>
                      {video.shop_name && (
                        <Text style={styles.videoHShop} numberOfLines={1}>🏪 {video.shop_name}</Text>
                      )}
                      <Text style={styles.videoHName} numberOfLines={2}>{video.product_name}</Text>
                      <Text style={styles.videoHPrice}>{formatMoney(video.product_price)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScroll}
          contentContainerStyle={styles.catContent}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.catPill}
              onPress={() => navigation.navigate('CategoryTab')}
            >
              <View style={styles.catIcon}>
                <Text style={styles.catEmoji}>{cat.icon}</Text>
              </View>
              <Text style={styles.catName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {catSections.map(({ category, products: catProds }) => (
          <View key={category.id}>
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{category.icon} {category.name}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('VideoTab')}>
                  <Text style={styles.sectionLink}>Xem tất cả</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.grid2}>
              {catProds.slice(0, 6).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={handleProductPress}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </View>
          </View>
        ))}

        {catSections.length === 0 && (
          <EmptyState icon="🦐" title="Chưa có sản phẩm nào" />
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
      <BottomNav active="home" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { fontWeight: '800', color: colors.navy, fontSize: 16 },
  brandDot: { color: colors.coral },
  topActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBtnText: { fontSize: 16 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.coral,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800', fontFamily: fonts.numeric },
  deliverRow: { marginTop: 10 },
  deliverText: { fontSize: 12.5, color: colors.muted },
  deliverBold: { fontWeight: '700', color: colors.navy },
  searchBar: {
    marginTop: 10,
    backgroundColor: colors.mint,
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  searchText: { fontSize: 13.5, color: colors.muted },
  videoSection: { paddingTop: 14, paddingBottom: 4, paddingHorizontal: 14 },
  videoHScroll: { gap: 8, paddingBottom: 4 },
  videoHCard: {
    width: VIDEO_CARD_W,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadows.small,
  },
  videoHThumbWrap: { position: 'relative', width: '100%', height: VIDEO_CARD_W * 1.3 },
  videoHThumb: { width: '100%', height: '100%' },
  videoHPlayOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoHPlayBtn: { fontSize: 28, color: 'rgba(255,255,255,0.9)', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  videoHViews: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  videoHViewsText: { color: '#fff', fontSize: 9 },
  videoHInfo: { padding: 8, gap: 2 },
  videoHShop: { fontSize: 10, color: colors.muted },
  videoHName: { fontSize: 12, fontWeight: '700', color: colors.navy },
  videoHPrice: { fontSize: 12, fontWeight: '800', color: colors.coral, fontFamily: fonts.numeric },
  catScroll: { maxHeight: 100, marginTop: 4 },
  catContent: { paddingHorizontal: 18, paddingVertical: 10, gap: 10 },
  catPill: { width: 74, alignItems: 'center' },
  catIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmoji: { fontSize: 26 },
  catName: { fontSize: 11.5, fontWeight: '600', color: colors.navy, marginTop: 6 },
  section: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 4 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontWeight: '800', color: colors.navy, fontSize: 15 },
  sectionLink: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 4,
    gap: 10,
  },
});
