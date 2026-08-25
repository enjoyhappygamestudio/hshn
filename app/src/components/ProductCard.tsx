import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
  Image,
} from 'react-native';
import { Product } from '../types';
import { colors, radii, shadows, fonts } from '../constants/theme';
import { formatMoney } from '../utils/format';
import { mediaUrl } from '../utils/media';

interface ProductCardProps {
  product: Product;
  onPress: (id: string) => void;
  onAddToCart: (product: Product) => void;
  cardWidth?: number;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(
  ({ product, onPress, onAddToCart, cardWidth }) => {
    const [added, setAdded] = useState(false);

    const salePct =
      product.oldPrice && !product.isOutOfStock
        ? Math.round((1 - product.price / product.oldPrice) * 100)
        : null;

    const imageUri = mediaUrl(product.images?.[0]);

    const handlePress = useCallback(() => onPress(product.id), [product.id, onPress]);
    const handleAdd = useCallback(
      (e: any) => {
        e.stopPropagation?.();
        onAddToCart(product);
        setAdded(true);
        setTimeout(() => setAdded(false), 1000);
      },
      [product, onAddToCart],
    );

    return (
      <TouchableOpacity
        style={[styles.card, cardWidth ? { width: cardWidth } : null]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={[styles.imageContainer, { backgroundColor: product.imageBg }]}>
          {salePct != null && salePct > 0 && (
            <View style={styles.saleBadge}>
              <Text style={styles.saleText}>-{salePct}%</Text>
            </View>
          )}
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.productImage} />
          ) : (
            <Text style={styles.emoji}>{product.emoji}</Text>
          )}
          {product.isOutOfStock && (
            <View style={styles.outOverlay}>
              <Text style={styles.outText}>Hết hàng</Text>
            </View>
          )}
          {!product.isOutOfStock && (
            <TouchableOpacity
              style={styles.cartIconBtn}
              onPress={handleAdd}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.cartIconText}>{added ? '✓' : '🛒'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          {product.shop && (
            <Text style={styles.shop} numberOfLines={1}>
              🏪 {product.shop}
            </Text>
          )}
          {product.voucher && (
            <View style={styles.voucherBadge}>
              <Text style={styles.voucherText}>🏷️ {product.voucher}</Text>
            </View>
          )}
          {(product.rating || product.distance) && (
            <Text style={styles.meta}>
              {product.rating ? `⭐ ${product.rating}` : ''}
              {product.rating && product.distance ? ' · ' : ''}
              {product.distance ? `📍 ${product.distance}` : ''}
            </Text>
          )}
          <View style={styles.priceRow}>
            {product.isOutOfStock ? (
              <Text style={[styles.price, { color: colors.muted }]}>Liên hệ</Text>
            ) : (
              <Text style={styles.price}>{formatMoney(product.price)}</Text>
            )}
            {product.oldPrice != null && (
              <Text style={styles.oldPrice}>{formatMoney(product.oldPrice)}</Text>
            )}
            <Text style={styles.unit}>{product.unit}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
    overflow: 'hidden',
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
    marginBottom: 10,
  },
  imageContainer: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emoji: { fontSize: 48 },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  saleBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.coral,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 2,
  },
  saleText: { fontSize: 9.5, fontWeight: '800', color: colors.white },
  outOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18,58,74,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  cartIconBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    ...shadows.card,
  },
  cartIconText: { fontSize: 15 },
  info: { padding: 10 },
  name: { fontSize: 12.5, fontWeight: '700', color: colors.navy, lineHeight: 16, minHeight: 32 },
  shop: { fontSize: 10.5, color: colors.muted, marginTop: 3 },
  voucherBadge: {
    backgroundColor: '#FFF1EC',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  voucherText: { fontSize: 10, fontWeight: '700', color: colors.coralDark },
  meta: { fontSize: 10.5, color: colors.muted, marginTop: 5 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 6, flexWrap: 'wrap' },
  price: { fontFamily: fonts.numeric, fontWeight: '800', fontSize: 14, color: colors.coral },
  oldPrice: {
    fontFamily: fonts.numeric,
    fontSize: 10.5,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  unit: { fontSize: 10, color: colors.muted },
});
