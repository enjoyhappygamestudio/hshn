import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  Animated,
  StyleSheet,
  StatusBar,
  Dimensions,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Share,
  PanResponder,
  Alert,
  Image,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { colors, fonts } from '../constants/theme';
import { mediaUrl } from '../utils/media';
import { formatMoney } from '../utils/format';
import { FeaturedVideo, VideoComment } from '../types';
import { fetchVideoComments, postVideoComment, getVideoLikeStatus, toggleVideoLike, recordVideoView, updateVideoComment, deleteVideoComment, fetchProductDetail } from '../services/api';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface VideoPlayerScreenProps {
  navigation: any;
  route: any;
}

export const VideoPlayerScreen: React.FC<VideoPlayerScreenProps> = ({ navigation, route }) => {
  const allVideos: FeaturedVideo[] = route.params?.allVideos || [route.params?.video];
  const initialIndex = route.params?.currentIndex ?? 0;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const video: FeaturedVideo = allVideos[currentIndex];
  const videoRef = useRef<Video>(null);
  const [showUI, setShowUI] = useState(true);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyTo, setReplyTo] = useState<VideoComment | null>(null);
  const cartScale = useRef(new Animated.Value(1)).current;
  const customer = useAuthStore((s) => s.customer);
  const customerId = customer?.id;
  const customerName = customer?.name || 'Khách';

  const vidUrl = mediaUrl(video.url) || '';
  const thumbUrl = mediaUrl(video.thumbnail_url);

  const indexRef = useRef(currentIndex);
  indexRef.current = currentIndex;
  const showCommentsRef = useRef(showComments);
  showCommentsRef.current = showComments;
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const [swipeArrow, setSwipeArrow] = useState<'up' | 'down' | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playIcon, setPlayIcon] = useState<'play' | 'pause' | null>(null);
  const playIconAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => () => {
    if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
  }, []);

  const showPlayPauseIcon = useCallback((kind: 'play' | 'pause') => {
    setPlayIcon(kind);
    playIconAnim.setValue(0);
    Animated.sequence([
      Animated.timing(playIconAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(400),
      Animated.timing(playIconAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setPlayIcon(null));
  }, [playIconAnim]);

  useEffect(() => {
    if (swipeArrow) {
      arrowAnim.setValue(0);
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(300),
        Animated.timing(arrowAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setSwipeArrow(null));
    }
  }, [swipeArrow]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (showCommentsRef.current) return false;
        return Math.abs(gestureState.dy) > 50 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const idx = indexRef.current;
        if (gestureState.dy < -80 && idx < allVideos.length - 1) {
          setSwipeArrow('up');
          setCurrentIndex(idx + 1);
        } else if (gestureState.dy > 80 && idx > 0) {
          setSwipeArrow('down');
          setCurrentIndex(idx - 1);
        }
      },
    })
  ).current;

  useEffect(() => {
    if (videoRef.current) videoRef.current.playAsync();
    setIsPaused(false);
    recordVideoView(video.id);
    loadComments();
    loadLikeStatus();
    setLiked(false);
    setLikeCount(0);
    setComments([]);
    setShowFullDesc(false);
    setShowComments(false);
    setReplyTo(null);
    setCommentText('');

    const itemInCart = useCartStore.getState().items.find((i) => i.productId === video.product_id);
    setCartAdded(!!itemInCart);
  }, [video.id]);

  const loadComments = async () => {
    try {
      const data = await fetchVideoComments(video.id);
      setComments(data);
    } catch {}
  };

  const loadLikeStatus = async () => {
    try {
      const data = await getVideoLikeStatus(video.id, customerId);
      setLiked(data.liked);
      setLikeCount(data.count);
    } catch {}
  };

  const toggleUI = () => setShowUI((s) => !s);

  const handleVideoPress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      if (isPausedRef.current) {
        videoRef.current?.playAsync();
        setIsPaused(false);
        showPlayPauseIcon('play');
      } else {
        videoRef.current?.pauseAsync();
        setIsPaused(true);
        showPlayPauseIcon('pause');
      }
    } else {
      lastTapRef.current = now;
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        toggleUI();
      }, 300);
    }
  }, [showPlayPauseIcon]);

  const handleSendComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text) return;
    const parentId = replyTo?.id || null;
    setCommentText('');
    setReplyTo(null);
    try {
      const newComment = await postVideoComment(video.id, text, customerId, customerName, parentId);
      setComments((prev) => [...prev, newComment]);
    } catch {}
  }, [commentText, video.id, customerId, customerName, replyTo]);

  const handleEditComment = useCallback(async (comment: VideoComment) => {
    if (editingComment === comment.id) {
      const text = editText.trim();
      if (!text) return;
      try {
        await updateVideoComment(comment.id, text);
        setComments((prev) => prev.map((c) => c.id === comment.id ? { ...c, content: text } : c));
        setEditingComment(null);
        setEditText('');
      } catch {}
    } else {
      setEditingComment(comment.id);
      setEditText(comment.content);
    }
  }, [editingComment, editText]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    Alert.alert('Xóa bình luận?', 'Bạn muốn xóa bình luận này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try {
            await deleteVideoComment(commentId);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
          } catch {}
        },
      },
    ]);
  }, []);

  const handleToggleLike = useCallback(async () => {
    if (!customerId) return;
    try {
      const data = await toggleVideoLike(video.id, customerId);
      setLiked(data.liked);
      setLikeCount((c) => (data.liked ? c + 1 : c - 1));
    } catch {}
  }, [video.id, customerId]);

  const addItemToCart = useCallback(async () => {
    const cart = useCartStore.getState();
    const pid = String(video.product_id);
    const itemInCart = cart.items.find((i) => i.productId === pid);

    if (!itemInCart) {
      let image = '';
      try {
        const detail = await fetchProductDetail(pid);
        image = detail.images?.[0] || '';
      } catch {}
      cart.addItem({
        id: pid,
        name: video.product_name,
        price: video.product_price,
        emoji: video.product_emoji,
        imageBg: video.product_image_bg,
        unit: video.product_unit,
        shop: video.shop_name || '',
        rating: 0,
        distance: '',
        isFresh: false,
        isOutOfStock: false,
      }, '1 phần', 1, image);
    }
  }, [video]);

  const handleAddToCart = useCallback(async () => {
    const pid = String(video.product_id);
    const cart = useCartStore.getState();
    const itemInCart = cart.items.find((i) => String(i.productId) === pid);

    if (itemInCart) {
      cart.removeItem(pid);
      setCartAdded(false);
      Animated.spring(cartScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
    } else {
      let image = '';
      try {
        const detail = await fetchProductDetail(pid);
        image = detail.images?.[0] || '';
      } catch {}
      cart.addItem({
        id: pid,
        name: video.product_name,
        price: video.product_price,
        emoji: video.product_emoji,
        imageBg: video.product_image_bg,
        unit: video.product_unit,
        shop: video.shop_name || '',
        rating: 0,
        distance: '',
        isFresh: false,
        isOutOfStock: false,
      }, '1 phần', 1, image);

      setCartAdded(true);
      cartScale.setValue(1);
      Animated.spring(cartScale, { toValue: 1.4, useNativeDriver: true, friction: 4 }).start();
    }
  }, [video, cartScale]);

  const handleBuyNow = useCallback(async () => {
    await addItemToCart();
    navigation.navigate('Cart');
  }, [addItemToCart, navigation]);

  const desc = video.product_description || '';

  const flattenComments = useCallback(() => {
    const map = new Map<string, VideoComment[]>();
    for (const c of comments) {
      const key = c.parent_id || '_root_';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    const result: (VideoComment & { depth: number })[] = [];
    const walk = (parentId: string | null, depth: number) => {
      const children = map.get(parentId || '_root_') || [];
      for (const child of children) {
        result.push({ ...child, depth });
        walk(child.id, depth + 1);
      }
    };
    walk(null, 0);
    return result;
  }, [comments]);

  const renderComment = ({ item }: { item: VideoComment & { depth: number } }) => {
    const isOwn = item.customer_id === customerId;
    const isEditing = editingComment === item.id;
    const isEdited = item.updated_at && item.updated_at !== item.created_at;
    const isReply = !!item.parent_id;
    const depth = item.depth || 0;
    const repliedTo = isReply ? comments.find((c) => c.id === item.parent_id) : null;

    const timeAgo = (() => {
      if (!item.created_at) return '';
      const diff = Date.now() - new Date(item.created_at).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'vừa xong';
      if (mins < 60) return `${mins} phút`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours} giờ`;
      const days = Math.floor(hours / 24);
      return `${days} ngày`;
    })();

    return (
      <View style={[styles.commentItem, { marginLeft: Math.min(depth, 3) * 20 }, depth > 0 && styles.commentItemReply]}>
        <View style={styles.commentAvatar}>
          <Text style={styles.commentAvatarText}>👩</Text>
        </View>
        <View style={[styles.commentBubble, isOwn && styles.commentBubbleOwn]}>
          <View style={styles.commentNameRow}>
            <Text style={styles.commentName}>{item.customer_name || 'Khách'}</Text>
            <View style={styles.commentRightActions}>
              <View style={styles.commentActions}>
                <TouchableOpacity onPress={() => { setReplyTo(item); setCommentText(`@${item.customer_name} `); }} style={styles.commentActionBtn}>
                  <Feather name="message-circle" size={20} color={colors.muted} />
                </TouchableOpacity>
                {isOwn && (
                  <>
                    <TouchableOpacity onPress={() => handleEditComment(item)} style={styles.commentActionBtn}>
                      <Feather name="edit-2" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteComment(item.id)} style={styles.commentActionBtn}>
                      <Feather name="trash-2" size={20} color="#ff6b6b" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
          {repliedTo && (
            <Text style={styles.replyToText}>Trả lời @{repliedTo.customer_name}</Text>
          )}
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              autoFocus
              onSubmitEditing={() => handleEditComment(item)}
              returnKeyType="send"
            />
          ) : (
            <Text style={styles.commentContent}>{item.content}</Text>
          )}
          <View style={styles.commentFooter}>
            <Text style={styles.commentTime}>{timeAgo}{isEdited ? ' · Đã sửa' : ''}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar hidden />

      {/* Swipe direction arrow */}
      {swipeArrow && (
        <Animated.View style={[styles.swipeArrowWrap, {
          opacity: arrowAnim,
          top: swipeArrow === 'up' ? SCREEN_H * 0.15 : SCREEN_H * 0.2,
        }]}>
          <Feather name={swipeArrow === 'up' ? 'chevron-up' : 'chevron-down'} size={SCREEN_H / 4} color="rgba(255,255,255,0.6)" />
        </Animated.View>
      )}

      {/* Video background */}
      <Pressable style={styles.videoWrapper} onPress={handleVideoPress}>
        <Video
          ref={videoRef}
          source={{ uri: vidUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          shouldPlay
          isMuted={false}
        />
      </Pressable>

      {/* Play/pause indicator on double tap */}
      {playIcon && (
        <Animated.View pointerEvents="none" style={[styles.playPauseIcon, { opacity: playIconAnim }]}>
          <Feather name={playIcon === 'pause' ? 'pause' : 'play'} size={64} color="rgba(255,255,255,0.9)" />
        </Animated.View>
      )}

      {showUI && !showComments && (
        <>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={() => {
                useCartStore.getState().removeItem(String(video.product_id));
                navigation.goBack();
              }}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Floating action buttons - right side bottom */}
          <View style={styles.floatingActions}>
            <TouchableOpacity style={styles.floatingBtn} onPress={handleToggleLike}>
              <Text style={styles.floatingIcon}>{liked ? '❤️' : '♡'}</Text>
              <Text style={styles.floatingLabel}>{likeCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.floatingBtn} onPress={() => setShowComments(true)}>
              <Text style={styles.floatingIcon}>💬</Text>
              <Text style={styles.floatingLabel}>{comments.length}</Text>
            </TouchableOpacity>
            <Animated.View style={{ transform: [{ scale: cartScale }] }}>
              <TouchableOpacity style={styles.floatingBtn} onPress={handleAddToCart}>
                <Text style={styles.floatingIcon}>🛒</Text>
                {cartAdded && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>+1</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity style={styles.floatingBtn} onPress={handleBuyNow}>
              <Text style={styles.floatingIcon}>🛍️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.floatingBtn} onPress={() => {
              Share.share({ message: `${video.product_name} - ${formatMoney(video.product_price)}\nXem tại Hải Sản Hà Nội` });
            }}>
              <Feather name="share-2" size={28} color="#fff" />
              <Text style={[styles.floatingLabel, { fontSize: 9 }]}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Shop info - bottom left */}
          <View style={styles.shopBar}>
            <View style={styles.shopIcon}>
              <Text style={styles.shopIconText}>🏪</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shopName}>{video.shop_name || 'Cửa hàng'}</Text>
              <Text style={styles.productName}>{video.product_name}</Text>
              <Text style={styles.productPrice}>{formatMoney(video.product_price)}</Text>
            </View>
          </View>
        </>
      )}

      {/* Comments modal */}
      <Modal visible={showComments} transparent animationType="slide" onRequestClose={() => setShowComments(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowComments(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContent}
          >
            <View>
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Bình luận ({comments.length})</Text>
                <TouchableOpacity
                  style={styles.commentsCloseBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={() => setShowComments(false)}
                >
                  <Text style={styles.commentsCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Product info */}
              <View style={styles.modalProductInfo}>
                <Text style={styles.modalProductName}>{video.product_name}</Text>
                <Text style={styles.modalProductPrice}>{formatMoney(video.product_price)}</Text>
                {desc ? (
                  <Text style={styles.modalProductDesc} numberOfLines={showFullDesc ? undefined : 2}>
                    {desc}
                  </Text>
                ) : null}
                {desc && desc.length > 80 && (
                  <TouchableOpacity
                    style={styles.descToggleBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => setShowFullDesc((s) => !s)}
                  >
                    <Text style={styles.descToggle}>{showFullDesc ? 'Thu gọn' : 'Xem thêm'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

              <FlatList
                data={flattenComments()}
                keyExtractor={(item) => item.id}
                renderItem={renderComment}
                style={styles.commentsList}
                contentContainerStyle={{ paddingBottom: 8 }}
                ListEmptyComponent={
                  <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 28 }}>Chưa có bình luận</Text>
                }
              />
              {replyTo && (
                <View style={styles.replyIndicator}>
                  <Text style={styles.replyIndicatorText} numberOfLines={1}>Đang trả lời @{replyTo.customer_name}</Text>
                  <TouchableOpacity
                    style={styles.replyCancelBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => { setReplyTo(null); setCommentText(''); }}
                  >
                    <Feather name="x" size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.commentInputBar}>
                <View style={styles.commentInputWrap}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Nhập bình luận..."
                    placeholderTextColor={colors.muted}
                    value={commentText}
                    onChangeText={setCommentText}
                    onSubmitEditing={handleSendComment}
                    returnKeyType="send"
                  />
                </View>
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment}>
                  <Text style={styles.sendBtnText}>Gửi</Text>
                </TouchableOpacity>
              </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoWrapper: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  video: { width: SCREEN_W, height: SCREEN_H },
  swipeArrowWrap: {
    position: 'absolute', alignSelf: 'center', zIndex: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  swipeArrowText: { fontSize: SCREEN_H / 4, fontWeight: '200', color: 'rgba(255,255,255,0.6)' },
  playPauseIcon: {
    position: 'absolute', top: SCREEN_H / 2 - 32, left: SCREEN_W / 2 - 32,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 30,
  },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 12, zIndex: 20,
  },
  closeBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  topRight: { flexDirection: 'row', gap: 8 },
  topIconBtn: { alignItems: 'center', minWidth: 40 },
  topIconText: { fontSize: 22 },
  topIconLabel: { color: '#fff', fontSize: 11, fontWeight: '600', marginTop: -2 },

  // Floating action buttons (right side)
  floatingActions: {
    position: 'absolute', right: 12, bottom: 120,
    alignItems: 'center', gap: 16, zIndex: 25,
  },
  floatingBtn: { alignItems: 'center', justifyContent: 'center', minWidth: 52, minHeight: 48 },
  floatingIcon: { fontSize: 28 },
  floatingIconWhite: { fontSize: 32, color: '#fff' },
  shareIcon: { fontSize: 32, color: '#fff', fontWeight: '900' },
  floatingLabel: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2 },
  floatingBuyBtn: {
    marginTop: 4,
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: colors.coral, borderRadius: 8,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Shop info
  shopBar: {
    position: 'absolute', bottom: 100, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 10,
    zIndex: 20, maxWidth: '65%',
  },
  shopIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  shopIconText: { fontSize: 22 },
  shopName: { color: '#aaa', fontSize: 11, fontWeight: '500' },
  productName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  productPrice: { color: '#FFD700', fontSize: 15, fontWeight: '800', fontFamily: fonts.numeric },

  // Comments modal
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    height: SCREEN_H * 0.72,
  },
  commentsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingLeft: 14, paddingRight: 8, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  commentsTitle: { color: colors.navy, fontSize: 16, fontWeight: '700' },
  commentsCloseBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  commentsCloseText: { color: colors.navy, fontSize: 22, fontWeight: '700', lineHeight: 26 },
  commentsList: { flex: 1, paddingHorizontal: 12, backgroundColor: colors.white },
  modalProductInfo: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.line,
    backgroundColor: colors.white,
  },
  modalProductName: { color: colors.navy, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  modalProductPrice: { color: colors.coral, fontSize: 16, fontWeight: '800', fontFamily: fonts.numeric, marginBottom: 4 },
  modalProductDesc: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  descToggleBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingRight: 12 },
  descToggle: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  commentItem: { flexDirection: 'row', gap: 10, marginTop: 14, paddingRight: 4 },
  commentAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.mint,
    alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarImg: { width: 34, height: 34, borderRadius: 17 },
  commentAvatarText: { color: colors.navy, fontSize: 16, fontWeight: '700' },
  commentBubble: { flex: 1 },
  commentBubbleOwn: { backgroundColor: colors.mint, borderRadius: 10, padding: 8 },
  commentNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  commentRightActions: {},
  commentActions: { flexDirection: 'row', gap: 4 },
  commentActionBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  editInput: { color: colors.navy, fontSize: 15, lineHeight: 21, marginTop: 2, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingVertical: 4 },
  commentTime: { color: colors.muted, fontSize: 11.5, marginTop: 4 },
  commentFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  replyBtn: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  commentItemReply: {},
  replyToText: { color: colors.muted, fontSize: 11.5, marginBottom: 2 },
  replyIndicator: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.mint, paddingLeft: 12, paddingRight: 4, paddingVertical: 4,
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  replyIndicatorText: { color: colors.muted, fontSize: 12.5, flex: 1 },
  replyCancelBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  commentName: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  commentContent: { color: colors.navy, fontSize: 14.5, lineHeight: 20, marginTop: 2 },
  commentInputBar: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.line,
    paddingHorizontal: 12, paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    backgroundColor: colors.white,
  },
  commentInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.line, borderRadius: 24,
    paddingLeft: 14, height: 48,
  },

  // Description
  descBar: {
    position: 'absolute', bottom: 100, left: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 10,
    zIndex: 15,
  },
  descText: { color: '#ddd', fontSize: 12, lineHeight: 17 },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 10, paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 30 : 8,
    zIndex: 20,
  },
  commentInput: { flex: 1, color: colors.navy, fontSize: 15, paddingVertical: 0 },
  sendBtn: { paddingHorizontal: 16, height: 48, justifyContent: 'center' },
  sendBtnText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
});
