export interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  unit: string;
  shop: string;
  voucher?: string;
  rating: number;
  distance: string;
  isFresh: boolean;
  isOutOfStock: boolean;
  stock?: number;
  imageBg: string;
  emoji: string;
  description?: string;
  ratingCount?: number;
  soldCount?: number;
  images?: string[];
  categoryId?: string;
  weight?: number;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id?: string;
  label: string;
  price: number;
  unit: string;
  stock: number;
}

export interface CartItem {
  productId: string;
  name: string;
  variant: string;
  price: number;
  quantity: number;
  emoji: string;
  imageBg: string;
  image?: string;
  weight?: number;
}

export interface Voucher {
  code: string;
  label: string;
  desc: string;
  type: 'percent' | 'fixed' | 'shipping';
  value?: number;
  cap?: number;
  minOrder?: number;
  icon: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  product_count?: number;
}

export interface DeliveryState {
  mode: 'hoatoc' | 'express2h' | 'interprovince' | 'appointment' | null;
  date: string | null;
  timeSlot: string | null;
}

export interface Address {
  name: string;
  phone: string;
  full: string;
}

export type PaymentMethod = 'cod' | 'wallet' | 'card';

export type OrderStatus = 'pending' | 'confirmed' | 'hard_to_ship' | 'customer_refused' | 'delivered' | 'exchanged' | 'returned' | 'cancelled';

export interface OrderItem {
  product_id: string;
  name: string;
  variant: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  code: string;
  total: number;
  subtotal?: number;
  discount?: number;
  shippingFee?: number;
  status: OrderStatus;
  deliveryEstimate: string;
  driver?: Driver;
  items?: OrderItem[];
  createdAt?: string;
  address?: Address;
  shippingTrackingCode?: string;
}

export interface TrackPoint {
  lat: number;
  lng: number;
}

export interface CarrierLive {
  status: string;
  statusText: string;
  currentLat?: number;
  currentLng?: number;
  pickup?: TrackPoint & { address?: string; name?: string };
  delivery?: TrackPoint & { address?: string; name?: string };
  route?: TrackPoint[];
  driver?: { id?: string; name?: string; phone?: string; rating?: number } | null;
  accept?: (TrackPoint & { time?: number }) | null;
  shareLink?: string;
  trackingCode?: string;
  distanceKm?: number;
  durationSec?: number;
  timestamps?: { accepted?: number; boarded?: number; pickedUp?: number; completed?: number };
}

export interface OrderTrackingPayload {
  orderId: string;
  orderCode: string;
  orderStatus: OrderStatus;
  deliveryMode?: string;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  addressSnapshot?: Address;
  carrier?: string | null;
  carrierTrackingCode?: string | null;
  carrierStatus?: string | null;
  carrierFee?: number;
  carrierError?: string | null;
  driver?: {
    id?: string;
    name?: string;
    phone?: string;
    plateNumber?: string;
    rating?: number;
    currentLat?: number;
    currentLng?: number;
  };
  live?: CarrierLive | null;
  liveError?: string | null;
  timeline?: { id: string; status: string; note: string; created_at: string }[];
}

export interface Driver {
  name: string;
  plateNumber: string;
  rating: number;
  phone: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  tier: string;
  order_count?: number;
  address?: string;
}

export type BottomTab = 'home' | 'category' | 'orders' | 'account';

export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  ProductDetail: { productId: string };
  Cart: undefined;
  Checkout: undefined;
  Success: { orderCode?: string };
  Tracking: { orderCode?: string };
  OrderList: undefined;
  AddressList: undefined;
  PaymentMethods: undefined;
  UserVouchers: undefined;
  Notifications: undefined;
  Support: undefined;
  Chat: { conversationId?: string };
  ChatList: undefined;
  VideoPlayer: { video: FeaturedVideo };
  VideoFeed: { videos: FeaturedVideo[] };
  Search: undefined;
};

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// ─── CHAT ───
export interface Conversation {
  id: string;
  subject: string;
  status: 'open' | 'closed';
  last_message_at: string;
  created_at: string;
  unread?: number;
  customer_name?: string;
  customer_phone?: string;
  last_message?: string;
}

export interface Message {
  id: string;
  sender_type: 'customer' | 'admin';
  sender_id?: string;
  content?: string;
  image_url?: string;
  read: boolean;
  created_at: string;
}

// ─── VIDEOS ───
export interface ProductVideo {
  id: string;
  url: string;
  thumbnail_url?: string;
  duration: number;
  file_size: number;
  is_primary: boolean;
  status: 'processing' | 'ready' | 'error';
  overlay_position: 'bottom-left' | 'bottom-right' | 'bottom-center';
  overlay_appear_at: number;
  overlay_disappear_at?: number;
  title?: string;
  description?: string;
  video_category?: string;
  sort_order?: number;
  views?: number;
}

export interface FeaturedVideo {
  id: string;
  url: string;
  thumbnail_url?: string;
  duration: number;
  title: string;
  views: number;
  product_id: string;
  product_name: string;
  product_price: number;
  product_emoji: string;
  product_image_bg: string;
  product_unit: string;
  product_description?: string;
  shop_id?: string;
  shop_name?: string;
  shop_phone?: string;
}

export interface VideoComment {
  id: string;
  video_id: string;
  customer_id?: string;
  customer_name: string;
  content: string;
  parent_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

// ─── SHIPPING ───
export interface ShippingPartner {
  id: string;
  name: string;
  logo: string;
  fee: number;
  isReal: boolean;
  timeMinutes: number;
  timeText: string;
  rating: number;
  ratingCount: number;
  available: boolean;
}
