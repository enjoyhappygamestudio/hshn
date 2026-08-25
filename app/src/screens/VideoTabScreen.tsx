import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Dimensions,
  TextInput,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '../components/BottomNav';
import { useCartStore } from '../stores/cartStore';
import { colors, radii, shadows, fonts, commonStyles } from '../constants/theme';
import { FeaturedVideo } from '../types';
import { fetchFeaturedVideos, recordVideoView } from '../services/api';
import { mediaUrl } from '../utils/media';
import { formatMoney } from '../utils/format';

const { width: SCREEN_W } = Dimensions.get('window');
const GAP = 10;
const PADDING = 14;
const CARD_W = (SCREEN_W - PADDING * 2 - GAP) / 2;

interface VideoTabScreenProps {
  navigation: any;
}

export const VideoTabScreen: React.FC<VideoTabScreenProps> = ({ navigation }) => {
  const [videos, setVideos] = useState<FeaturedVideo[]>([]);
  const [filter, setFilter] = useState<'all' | 'latest' | 'most_viewed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const cartCount = useCartStore((s) => s.count());
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (__DEV__) console.log('[VideoTab] mounting...');
    (async () => {
      try {
        const t1 = Date.now();
        const data = await fetchFeaturedVideos();
        if (__DEV__) console.log(`[VideoTab] API done in ${Date.now() - t1}ms: ${data.length} videos`);
        setVideos(data);
      } catch (e: any) {
        if (__DEV__) console.log('[VideoTab] error:', e.message);
      }
    })();
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playAsync();
  }, [videos]);

  const filtered = (() => {
    let list = [...videos];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((v) =>
        v.product_name.toLowerCase().includes(q) ||
        v.title?.toLowerCase().includes(q) ||
        v.shop_name?.toLowerCase().includes(q)
      );
    }
    switch (filter) {
      case 'latest':
        list.sort((a, b) => (b.id > a.id ? 1 : -1));
        break;
      case 'most_viewed':
        list.sort((a, b) => b.views - a.views);
        break;
    }
    return list;
  })();

  const firstVideo = videos[0];
  const firstVidUrl = mediaUrl(firstVideo?.url) || '';
  const firstThumbUrl = mediaUrl(firstVideo?.thumbnail_url);

  const handleTabPress = useCallback(
    (tab: string) => {
      if (tab === 'video') return;
      const target = tab === 'home' ? 'Home' : tab === 'orders' ? 'OrdersTab' : 'AccountTab';
      if (typeof navigation.jumpTo === 'function') {
        navigation.jumpTo(target);
      } else {
        navigation.navigate('MainTabs', { screen: target });
      }
    },
    [navigation],
  );

  return (
    <SafeAreaView style={commonStyles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero video */}
        {firstVideo && (
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              recordVideoView(firstVideo.id);
              navigation.navigate('VideoPlayer', { video: firstVideo, allVideos: videos, currentIndex: 0 });
            }}
          >
            <View style={styles.heroWrap}>
              <Video
                ref={videoRef}
                source={{ uri: firstVidUrl }}
                style={styles.heroVideo}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isMuted
                isLooping
              />
              <View style={styles.heroOverlay}>
                <Text style={styles.heroPlayBtn}>▶</Text>
              </View>
              {firstVideo.shop_name && (
                <View style={styles.heroShop}>
                  <Text style={styles.heroShopText}>🏪 {firstVideo.shop_name}</Text>
                </View>
              )}
              <View style={styles.heroInfo}>
                <Text style={styles.heroName}>{firstVideo.product_name}</Text>
                <Text style={styles.heroPrice}>{formatMoney(firstVideo.product_price)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Filter bar */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterBtn, showSearch && styles.filterBtnActive]}
            onPress={() => setShowSearch((s) => !s)}
          >
            <Text style={styles.filterBtnText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'latest' && styles.filterBtnActive]}
            onPress={() => setFilter(filter === 'latest' ? 'all' : 'latest')}
          >
            <Text style={[styles.filterBtnText, filter === 'latest' && styles.filterBtnTextActive]}>Mới nhất</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'most_viewed' && styles.filterBtnActive]}
            onPress={() => setFilter(filter === 'most_viewed' ? 'all' : 'most_viewed')}
          >
            <Text style={[styles.filterBtnText, filter === 'most_viewed' && styles.filterBtnTextActive]}>Xem nhiều nhất</Text>
          </TouchableOpacity>
        </View>

        {showSearch && (
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm video..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        )}

        {/* Video grid */}
        <View style={styles.grid}>
          {filtered.map((video) => {
            const thumbUrl = mediaUrl(video.thumbnail_url);
            return (
              <TouchableOpacity
                key={video.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => {
                  recordVideoView(video.id);
                  navigation.navigate('VideoPlayer', { video, allVideos: filtered, currentIndex: filtered.indexOf(video) });
                }}
              >
                <View style={styles.thumbWrap}>
                  {thumbUrl ? (
                    <Image source={{ uri: thumbUrl }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, { backgroundColor: video.product_image_bg || '#DCEFEC', justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ fontSize: 36 }}>{video.product_emoji || '🎬'}</Text>
                    </View>
                  )}
                  <View style={styles.playOverlay}>
                    <Text style={styles.playBtn}>▶</Text>
                  </View>
                  <View style={styles.viewsBadge}>
                    <Text style={styles.viewsText}>👁️ {video.views}</Text>
                  </View>
                </View>
                <View style={styles.info}>
                  {video.shop_name && (
                    <Text style={styles.shop} numberOfLines={1}>🏪 {video.shop_name}</Text>
                  )}
                  <Text style={styles.name} numberOfLines={2}>{video.product_name}</Text>
                  <Text style={styles.price}>{formatMoney(video.product_price)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
      <BottomNav active="video" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  heroWrap: { position: 'relative', width: SCREEN_W, height: SCREEN_W * 0.7 },
  heroVideo: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  heroPlayBtn: { fontSize: 50, color: 'rgba(255,255,255,0.9)', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  heroShop: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  heroShopText: { color: '#fff', fontSize: 12 },
  heroInfo: {
    position: 'absolute', bottom: 10, left: 10, right: 10,
  },
  heroName: { color: '#fff', fontSize: 16, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroPrice: { color: '#FFD700', fontSize: 15, fontWeight: '800', fontFamily: fonts.numeric, marginTop: 2 },

  filterBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: PADDING, paddingVertical: 10,
  },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 18, backgroundColor: colors.mint,
    borderWidth: 1, borderColor: colors.line,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { fontSize: 12, fontWeight: '600', color: colors.navy },
  filterBtnTextActive: { color: '#fff' },

  searchInput: {
    marginHorizontal: PADDING, marginBottom: 8,
    height: 38, borderRadius: 10,
    backgroundColor: colors.mint, paddingHorizontal: 12,
    fontSize: 13, color: colors.navy,
  },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: PADDING, gap: GAP,
  },
  card: {
    width: CARD_W,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadows.small,
  },
  thumbWrap: { position: 'relative', width: '100%', height: CARD_W * 1.2 },
  thumb: { width: '100%', height: '100%' },
  playOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  playBtn: { fontSize: 32, color: 'rgba(255,255,255,0.9)', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  viewsBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  viewsText: { color: '#fff', fontSize: 9 },
  info: { padding: 8, gap: 2 },
  shop: { fontSize: 10, color: colors.muted },
  name: { fontSize: 12, fontWeight: '700', color: colors.navy },
  price: { fontSize: 12, fontWeight: '800', color: colors.coral, fontFamily: fonts.numeric },
});
