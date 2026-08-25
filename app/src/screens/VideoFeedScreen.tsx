import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, shadows, fonts } from '../constants/theme';
import { mediaUrl } from '../utils/media';
import { FeaturedVideo } from '../types';
import { formatMoney } from '../utils/format';
import { recordVideoView } from '../services/api';
import { BackButton } from '../components/BackButton';

const { width: SCREEN_W } = Dimensions.get('window');
const GAP = 10;
const PADDING = 14;
const CARD_W = (SCREEN_W - PADDING * 2 - GAP) / 2;

interface VideoFeedScreenProps {
  navigation: any;
  route: any;
}

export const VideoFeedScreen: React.FC<VideoFeedScreenProps> = ({ navigation, route }) => {
  const videos: FeaturedVideo[] = route.params?.videos || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Tất cả video</Text>
        <View style={{ width: 70 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
        {videos.map((video) => (
          <TouchableOpacity
            key={video.id}
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => {
              recordVideoView(video.id);
              navigation.navigate('VideoPlayer', { video, allVideos: videos, currentIndex: videos.indexOf(video) });
            }}
          >
            <View style={styles.thumbWrap}>
              {video.thumbnail_url ? (
                <Image
                  source={{ uri: mediaUrl(video.thumbnail_url) || undefined }}
                  style={styles.thumb}
                />
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
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: PADDING, paddingVertical: 12,
    gap: GAP,
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
