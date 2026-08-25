import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResizeMode, Video } from 'expo-av';
import { QuantityStepper } from '../components/QuantityStepper';
import { ActionBar } from '../components/ActionBar';
import { useCartStore } from '../stores/cartStore';
import { colors, radii, commonStyles } from '../constants/theme';
import { formatMoney } from '../utils/format';
import { Product, ProductVideo } from '../types';
import { fetchProductDetail, fetchProductVideos } from '../services/api';
import { mediaUrl } from '../utils/media';
import { BackButton } from '../components/BackButton';
import { MediaImage } from '../components/MediaImage';

const SCREEN_W = Dimensions.get('window').width;

interface ProductDetailScreenProps {
  navigation: any;
  route: any;
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [variantIndex, setVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<ProductVideo[]>([]);
  const [videoIndex, setVideoIndex] = useState(0);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    (async () => {
      try {
        const pid = route.params?.productId || '';
        const p = await fetchProductDetail(pid);
        setProduct(p);
        setVariants(p.variants || []);
        const vids = await fetchProductVideos(pid);
        setVideos(vids);
      } catch {
        // Fallback to mock already set
      } finally {
        setLoading(false);
      }
    })();
  }, [route.params?.productId]);

  const variant = variants.length > 0
    ? variants[variantIndex]
    : { label: '', price: product?.price || 0, unit: product?.unit || '/kg', stock: product?.stock ?? 0 };
  const stock = Math.max(0, Number(variant.stock ?? product?.stock ?? 0));
  const outOfStock = stock <= 0;
  const price = variant.price || product?.price || 0;
  const oldPrice = product?.oldPrice;
  const lineTotal = price * quantity;
  const oldLineTotal = oldPrice ? oldPrice * quantity : undefined;

  const handleAddToCart = useCallback(() => {
    if (!product || outOfStock) return;
    useCartStore.getState().addItem(product, variant.label || '1 phần', quantity, undefined, price);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  }, [product, variant, quantity, outOfStock, price]);

  const handleBuyNow = useCallback(() => {
    handleAddToCart();
    navigation.navigate('Cart');
  }, [handleAddToCart, navigation]);

  return (
    <SafeAreaView style={commonStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="rgba(255,255,255,0.96)" />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Chi tiết sản phẩm</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Chat')}>
            <Text style={styles.backText}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn}>
            <Text style={styles.backText}>♡</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn}>
            <Text style={styles.backText}>↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
      <ScrollView style={styles.body}>
        <View style={[styles.gallery, { backgroundColor: product?.imageBg || '#DCEFEC' }]}>
          {videos.length > 0 ? (
            <View style={{ width: SCREEN_W, height: 260 }}>
              <Video
                ref={videoRef}
                source={{ uri: mediaUrl(videos[videoIndex]?.url) || '' }}
                style={{ width: SCREEN_W, height: 260 }}
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay={false}
                isMuted
                usePoster
                posterSource={{ uri: mediaUrl(videos[videoIndex]?.thumbnail_url) || undefined }}
              />
              <TouchableOpacity
                style={styles.fullscreenBtn}
                onPress={() => {
                  const v = videos[videoIndex];
                  const mappedVideo = {
                      id: v.id,
                      url: mediaUrl(v.url) || '',
                      thumbnail_url: v.thumbnail_url,
                      duration: v.duration,
                      title: v.title || product?.name || '',
                      views: 0,
                      product_id: product?.id || '',
                      product_name: product?.name || '',
                      product_price: product?.price || 0,
                      product_emoji: product?.emoji || '',
                      product_image_bg: product?.imageBg || '',
                      product_unit: product?.unit || '',
                      product_description: product?.description || '',
                      shop_id: '',
                      shop_name: product?.shop || '',
                    };
                  const allMapped = videos.map((vv) => ({
                      ...mappedVideo,
                      id: vv.id,
                      url: mediaUrl(vv.url) || '',
                      thumbnail_url: vv.thumbnail_url,
                      duration: vv.duration,
                      title: vv.title || product?.name || '',
                    }));
                  navigation.navigate('VideoPlayer', {
                    video: mappedVideo,
                    allVideos: allMapped,
                    currentIndex: videoIndex,
                  });
                }}
              >
                <Text style={styles.fullscreenBtnText}>⛶</Text>
              </TouchableOpacity>
              {product && (
                <TouchableOpacity
                  style={styles.videoOverlay}
                  onPress={() => {
                    if (!product || outOfStock) return;
                    useCartStore.getState().addItem(product, variant.label || '1 phần', 1, undefined, price);
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 1800);
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.overlayCard}>
                    <Text style={styles.overlayEmoji}>{product.emoji}</Text>
                    <View style={styles.overlayInfo}>
                      <Text style={styles.overlayName} numberOfLines={1}>{product.name}</Text>
                      <Text style={styles.overlayPrice}>{formatMoney(price)}</Text>
                    </View>
                    <View style={styles.overlayBtn}>
                      <Text style={styles.overlayBtnText}>+</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              {videos.length > 1 && (
                <View style={styles.videoDots}>
                  {videos.map((_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.videoDot, i === videoIndex && styles.videoDotActive]}
                      onPress={() => { setVideoIndex(i); videoRef.current?.stopAsync(); }}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : product?.images && product.images.length > 0 ? (
            <MediaImage
              uri={mediaUrl(product.images[0])}
              style={{ width: SCREEN_W, height: 260 }}
            />
          ) : (
            <Text style={styles.galleryEmoji}>{product?.emoji || '🦞'}</Text>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.name}>{product?.name || 'Sản phẩm'}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>
              ⭐ <Text style={styles.ratingBold}>{product?.rating || 0}</Text>
              {product?.ratingCount ? ` (${product.ratingCount} đánh giá)` : ''}
              {product?.soldCount ? ` · Đã bán ${(product.soldCount / 1000).toFixed(1)}k` : ''}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatMoney(lineTotal)}</Text>
            {oldLineTotal ? (
              <Text style={styles.oldPrice}>{formatMoney(oldLineTotal)}</Text>
            ) : null}
          </View>
          <Text style={styles.priceMeta}>
            {formatMoney(price)}{variant.unit || product?.unit || '/kg'}
            {quantity > 1 ? `  ×  ${quantity}` : ''}
          </Text>
          <Text style={[styles.stockLine, outOfStock && styles.stockLineEmpty]}>
            {outOfStock
              ? 'Hết hàng'
              : `Còn ${stock} sản phẩm trong kho`}
          </Text>

          {variants.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>Phân Loại</Text>
              <View style={styles.variantRow}>
                {variants.map((v, i) => (
                  <TouchableOpacity
                    key={v.id || i}
                    style={[styles.variant, i === variantIndex && styles.variantSel]}
                    onPress={() => {
                      setVariantIndex(i);
                      setQuantity(1);
                    }}
                  >
                    <Text
                      style={[
                        styles.variantLabel,
                        i === variantIndex && styles.variantLabelSel,
                      ]}
                    >
                      {v.label}
                    </Text>
                    <Text
                      style={[
                        styles.variantPrice,
                        i === variantIndex && styles.variantPriceSel,
                      ]}
                    >
                      {formatMoney(v.price)}
                    </Text>
                    <Text style={styles.variantStock}>
                      {Number(v.stock ?? 0) > 0 ? `Còn ${v.stock}` : 'Hết hàng'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.fieldLabel}>Số lượng</Text>
          {outOfStock ? (
            <Text style={styles.stockHint}>Hiện không thể đặt phân loại này.</Text>
          ) : (
            <QuantityStepper
              value={quantity}
              stock={stock}
              onChange={setQuantity}
            />
          )}
          {!outOfStock && (
            <View style={styles.lineBox}>
              <View style={styles.lineRow}>
                <Text style={styles.lineLabel}>Đơn giá</Text>
                <Text style={styles.lineValue}>{formatMoney(price)}</Text>
              </View>
              <View style={styles.lineRow}>
                <Text style={styles.lineLabel}>Số lượng</Text>
                <Text style={styles.lineValue}>×{quantity}</Text>
              </View>
              <View style={[styles.lineRow, styles.lineTotalRow]}>
                <Text style={styles.lineTotalLabel}>Thành tiền</Text>
                <Text style={styles.lineTotalValue}>{formatMoney(lineTotal)}</Text>
              </View>
            </View>
          )}

          <Text style={styles.fieldLabel}>Mô tả sản phẩm</Text>
          <Text style={styles.desc}>
            {product?.description || 'Không có mô tả'}
          </Text>
        </View>
      </ScrollView>
      )}

      <ActionBar
        secondaryLabel="Thêm vào giỏ"
        secondaryAction={handleAddToCart}
        primaryLabel={outOfStock ? 'Hết hàng' : `Mua ngay · ${formatMoney(lineTotal)}`}
        primaryAction={handleBuyNow}
        primaryDisabled={outOfStock}
      />

      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>
            Đã thêm {quantity} × {formatMoney(price)} = {formatMoney(lineTotal)}
          </Text>
        </View>
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
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 15, color: colors.navy },
  headerTitle: { fontWeight: '800', color: colors.navy, fontSize: 14.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  body: { flex: 1 },
  gallery: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  galleryEmoji: { fontSize: 100 },
  dots: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(18,58,74,0.25)',
  },
  dotActive: { backgroundColor: colors.primary, width: 16, borderRadius: 3 },
  content: { padding: 18 },
  name: { fontSize: 19, fontWeight: '800', color: colors.navy },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 10 },
  ratingText: { fontSize: 12.5, color: colors.muted },
  ratingBold: { color: colors.navy, fontWeight: '700' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 6,
  },
  price: { fontFamily: 'Inter', fontWeight: '800', fontSize: 23, color: colors.coral },
  oldPrice: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  priceMeta: { fontSize: 12.5, color: colors.muted, marginBottom: 6 },
  lineBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.mint,
    gap: 8,
  },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineLabel: { fontSize: 12.5, color: colors.muted },
  lineValue: { fontSize: 13, fontWeight: '700', color: colors.navy },
  lineTotalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(7,140,134,0.2)',
    paddingTop: 8,
    marginTop: 2,
  },
  lineTotalLabel: { fontSize: 13, fontWeight: '800', color: colors.navy },
  lineTotalValue: { fontFamily: 'Inter', fontWeight: '800', fontSize: 16, color: colors.coral },
  stockLine: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  stockLineEmpty: { color: colors.danger },
  stockHint: { fontSize: 12, color: colors.danger, marginTop: 2 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: colors.navy, marginTop: 18, marginBottom: 10 },
  variantRow: { flexDirection: 'row', gap: 10 },
  variant: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
  },
  variantSel: { borderColor: colors.primary, backgroundColor: colors.mint },
  variantLabel: { fontSize: 12.5, fontWeight: '700', color: colors.navy },
  variantLabelSel: { color: colors.primary },
  variantPrice: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 12.5,
    color: colors.navy,
    marginTop: 3,
  },
  variantPriceSel: { color: colors.primary },
  variantStock: { fontSize: 11, color: colors.muted, marginTop: 2 },
  desc: { fontSize: 13, lineHeight: 20, color: '#3d5560', marginTop: 6 },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 100,
    backgroundColor: colors.navy,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    zIndex: 60,
  },
  toastText: { color: colors.white, fontSize: 12.5, fontWeight: '600' },

  // ── Video ──
  videoOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  overlayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18,58,74,0.88)',
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  overlayEmoji: { fontSize: 30 },
  overlayInfo: { flex: 1 },
  overlayName: { fontSize: 13, fontWeight: '700', color: colors.white },
  overlayPrice: { fontSize: 15, fontWeight: '800', color: colors.coral, marginTop: 2 },
  overlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayBtnText: { color: colors.white, fontSize: 20, fontWeight: '700', lineHeight: 22 },
  videoDots: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
  },
  videoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  videoDotActive: { backgroundColor: colors.white, width: 16, borderRadius: 3 },
  fullscreenBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fullscreenBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
