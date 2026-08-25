import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductCard } from '../components/ProductCard';
import { MediaImage, prefetchMedia } from '../components/MediaImage';
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

// Mũi tên chiếm cột riêng hai bên nên đúng 4 danh mục lọt màn hình mà không bị che.
const CAT_GAP = 8;
const CAT_H_PADDING = 6;
const CAT_ARROW_SLOT = 26;
const CAT_ARROW_SIZE = 26;
const CAT_PILL_W =
  (SCREEN_W - CAT_ARROW_SLOT * 2 - CAT_H_PADDING * 2 - CAT_GAP * 3) / 4;
const CAT_ICON_SIZE = CAT_PILL_W - 12;
// Canh mũi tên theo tâm icon thay vì tâm cả ô (ô còn có tên danh mục bên dưới).
const CAT_ARROW_TOP = 10 + CAT_ICON_SIZE / 2 - CAT_ARROW_SIZE / 2;

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredVideos, setFeaturedVideos] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [canScrollCatLeft, setCanScrollCatLeft] = useState(false);
  const [canScrollCatRight, setCanScrollCatRight] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const catScrollRef = useRef<ScrollView>(null);
  const catScrollX = useRef(0);
  const catContentW = useRef(0);
  const catViewportW = useRef(0);

  const updateCatArrows = useCallback(() => {
    const x = catScrollX.current;
    const maxX = catContentW.current - catViewportW.current;
    setCanScrollCatLeft(x > 4);
    setCanScrollCatRight(maxX > 4 && x < maxX - 4);
  }, []);
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
      const previewUrls = [
        ...prods.slice(0, 12).map((p) => mediaUrl(p.images?.[0])),
        ...videos.slice(0, 4).map((v) => mediaUrl(v.thumbnail_url)),
      ];
      prefetchMedia(previewUrls);
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

  const handleCategoryPress = useCallback((categoryId: string) => {
    setSelectedCategoryId((current) => (current === categoryId ? null : categoryId));
  }, []);

  const handleCatScroll = useCallback((e: any) => {
    catScrollX.current = e.nativeEvent.contentOffset.x;
    updateCatArrows();
  }, [updateCatArrows]);

  const handleCatContentSize = useCallback((w: number) => {
    catContentW.current = w;
    updateCatArrows();
  }, [updateCatArrows]);

  const handleCatLayout = useCallback((e: any) => {
    catViewportW.current = e.nativeEvent.layout.width;
    updateCatArrows();
  }, [updateCatArrows]);

  const scrollCategories = useCallback((direction: 1 | -1) => {
    const step = CAT_PILL_W + CAT_GAP;
    const maxX = Math.max(0, catContentW.current - catViewportW.current);
    const next = Math.min(Math.max(catScrollX.current + direction * step * 2, 0), maxX);
    catScrollRef.current?.scrollTo({ x: next, animated: true });
  }, []);

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
    const sections = Object.values(map);
    return selectedCategoryId
      ? sections.filter((s) => s.category.id === selectedCategoryId)
      : sections;
  }, [products, categories, selectedCategoryId]);

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

        <View style={styles.catWrap}>
          <View style={styles.catArrowSlot}>
            {canScrollCatLeft && (
              <TouchableOpacity
                style={styles.catArrowBtn}
                onPress={() => scrollCategories(-1)}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Text style={styles.catArrowText}>‹</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            ref={catScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catScroll}
            contentContainerStyle={styles.catContent}
            onScroll={handleCatScroll}
            onContentSizeChange={handleCatContentSize}
            onLayout={handleCatLayout}
            scrollEventThrottle={16}
          >
            {categories.map((cat) => {
              const active = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.catPill}
                  onPress={() => handleCategoryPress(cat.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catIcon, active && styles.catIconActive]}>
                    <Text style={styles.catEmoji}>{cat.icon}</Text>
                  </View>
                  <Text style={[styles.catName, active && styles.catNameActive]} numberOfLines={2}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.catArrowSlot}>
            {canScrollCatRight && (
              <TouchableOpacity
                style={styles.catArrowBtn}
                onPress={() => scrollCategories(1)}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Text style={styles.catArrowText}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {selectedCategoryId && (
          <TouchableOpacity style={styles.clearFilter} onPress={() => setSelectedCategoryId(null)}>
            <Text style={styles.clearFilterText}>✕ Bỏ lọc danh mục</Text>
          </TouchableOpacity>
        )}

        {featuredVideos.length > 0 && !selectedCategoryId && (
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
              {featuredVideos.slice(0, 2).map((video) => {
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
                      {thumbUrl ? (
                        <MediaImage uri={thumbUrl} style={styles.videoHThumb} />
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

        {catSections.map(({ category, products: catProds }) => (
          <View key={category.id}>
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{category.icon} {category.name}</Text>
                {selectedCategoryId !== category.id && catProds.length > 6 && (
                  <TouchableOpacity onPress={() => handleCategoryPress(category.id)}>
                    <Text style={styles.sectionLink}>Xem tất cả</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.grid2}>
              {(selectedCategoryId === category.id ? catProds : catProds.slice(0, 6)).map((product) => (
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
          <EmptyState
            icon="🦐"
            title={selectedCategoryId ? 'Danh mục này chưa có sản phẩm' : 'Chưa có sản phẩm nào'}
          />
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
  videoSection: { paddingTop: 16, paddingBottom: 8, paddingHorizontal: 14 },
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
  videoHInfo: { padding: 10, gap: 3 },
  videoHShop: { fontSize: 10.5, lineHeight: 14, color: colors.muted },
  videoHName: { fontSize: 12.5, lineHeight: 17, fontWeight: '700', color: colors.navy },
  videoHPrice: { fontSize: 13.5, fontWeight: '800', color: colors.coral, fontFamily: fonts.numeric },
  catWrap: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  catArrowSlot: {
    width: CAT_ARROW_SLOT,
    paddingTop: CAT_ARROW_TOP,
    alignItems: 'center',
  },
  catArrowBtn: {
    width: CAT_ARROW_SIZE,
    height: CAT_ARROW_SIZE,
    borderRadius: CAT_ARROW_SIZE / 2,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catArrowText: {
    fontSize: 17,
    lineHeight: 19,
    fontWeight: '800',
    color: colors.primary,
  },
  catScroll: { flex: 1, maxHeight: 116 },
  catContent: { paddingHorizontal: CAT_H_PADDING, paddingVertical: 10, gap: CAT_GAP },
  catPill: { width: CAT_PILL_W, alignItems: 'center' },
  catIcon: {
    width: CAT_ICON_SIZE,
    height: CAT_ICON_SIZE,
    borderRadius: 18,
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIconActive: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  catEmoji: { fontSize: 26 },
  catName: { fontSize: 11.5, fontWeight: '600', color: colors.navy, marginTop: 6, textAlign: 'center' },
  catNameActive: { color: colors.primary, fontWeight: '800' },
  clearFilter: { paddingHorizontal: 18, paddingBottom: 4 },
  clearFilterText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  section: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 6 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 42,
    marginBottom: 2,
  },
  sectionTitle: {
    fontWeight: '800',
    color: colors.navy,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: 0.2,
  },
  sectionLink: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.primary,
    fontWeight: '700',
    paddingVertical: 6,
    paddingLeft: 10,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 4,
    gap: 10,
  },
});
