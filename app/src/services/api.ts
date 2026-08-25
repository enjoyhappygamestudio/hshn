import axios from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL, API_TIMEOUT } from '../constants/config';
import { Product, Category, Voucher, Order, Conversation, Message, ProductVideo, ShippingPartner, FeaturedVideo, VideoComment, OrderTrackingPayload } from '../types';

let _token: string | null = null;

export function setApiToken(token: string | null) {
  _token = token;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

if (__DEV__) {
  console.log(`[API] Base URL: ${API_BASE_URL}`);
  console.log(`[API] Platform: ${Platform.OS}`);
}

api.interceptors.request.use(
  (config) => {
    if (_token) {
      config.headers.Authorization = `Bearer ${_token}`;
    }
    if (__DEV__) {
      console.log(`[API] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data ? JSON.stringify(config.data).slice(0, 200) : '');
    }
    return config;
  },
  (err) => {
    if (__DEV__) console.log('[API] Request Error:', err.message);
    return Promise.reject(err);
  },
);

api.interceptors.response.use(
  (res) => {
    if (__DEV__) {
      console.log(`[API] ← ${res.status} ${res.config.url}`, JSON.stringify(res.data).slice(0, 200));
    }
    return res.data;
  },
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Lỗi kết nối';
    if (__DEV__) {
      console.log(`[API] ✖ ${err.config?.url} ${err.code || ''} ${err.response?.status || ''} — ${msg}`);
    }
    return Promise.reject(new Error(msg));
  },
);

// ─── Products ───
const PRODUCTS_PAGE_SIZE = 100; // API giới hạn limit tối đa 100

export async function fetchProducts(): Promise<Product[]> {
  const first: any = await api.get('/products', { params: { page: 1, limit: PRODUCTS_PAGE_SIZE } });
  const rows: any[] = [...(first.data || [])];

  const totalPages = first.pagination?.totalPages || 1;
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        api.get('/products', { params: { page: i + 2, limit: PRODUCTS_PAGE_SIZE } }),
      ),
    );
    for (const res of rest as any[]) rows.push(...(res.data || []));
  }

  return rows.map(mapProduct);
}

export async function fetchProductDetail(id: string): Promise<Product> {
  const res: any = await api.get(`/products/${id}`);
  return mapProduct(res.data);
}

export async function fetchProductVariants(productId: string): Promise<any[]> {
  const res: any = await api.get(`/products/${productId}/variants`);
  return res.data;
}

export function trackProductView(productId: string) {
  if (!productId) return;
  api.post(`/products/${productId}/view`).catch(() => {});
}

export function trackAddToCart(productId: string, quantity = 1) {
  if (!productId) return;
  api.post(`/products/${productId}/add-to-cart`, { quantity }).catch(() => {});
}

// ─── Categories ───
export async function fetchCategories(): Promise<Category[]> {
  const res: any = await api.get('/categories');
  return res.data;
}

// ─── Vouchers ───
export async function fetchVouchers(): Promise<Voucher[]> {
  const res: any = await api.get('/vouchers');
  return res.data.map(mapVoucher);
}

export async function validateVoucher(code: string, subtotal: number): Promise<Voucher> {
  const res: any = await api.post('/vouchers/validate', { code, subtotal });
  return mapVoucher(res.data);
}

// ─── Orders ───
export async function createOrder(data: any): Promise<Order> {
  const res: any = await api.post('/orders', data);
  return mapOrder(res.data);
}

export async function fetchOrders(): Promise<Order[]> {
  const res: any = await api.get('/orders');
  return res.data.map(mapOrder);
}

export async function fetchOrderDetail(code: string): Promise<Order> {
  const res: any = await api.get(`/orders/${code}`);
  return mapOrder(res.data);
}

export async function fetchOrderTracking(orderId: string): Promise<OrderTrackingPayload> {
  const res: any = await api.get(`/orders/${orderId}/track`);
  return res.data;
}

export async function cancelOrder(orderId: string, reason?: string): Promise<Order> {
  const res: any = await api.post(`/orders/${orderId}/cancel`, { reason });
  return mapOrder(res.data);
}

// ─── Auth ───
export async function login(phone: string, password: string): Promise<{ customer: any; token: string }> {
  const res: any = await api.post('/auth/login', { phone, password });
  return res.data;
}

export async function register(name: string, phone: string, password: string, email?: string): Promise<{ customer: any; token: string }> {
  const res: any = await api.post('/auth/register', { name, phone, password, email });
  return res.data;
}

export async function forgotPassword(phone: string): Promise<{ message: string; code: string }> {
  const res: any = await api.post('/auth/forgot-password', { phone });
  return res.data;
}

export async function resetPassword(phone: string, code: string, password: string): Promise<{ message: string }> {
  const res: any = await api.post('/auth/reset-password', { phone, code, password });
  return res.data;
}

// ─── OTP Verification ───
export async function sendOtp(phone: string): Promise<{ message: string; code: string }> {
  const res: any = await api.post('/auth/send-otp', { phone });
  return res.data;
}

export async function verifyOtp(phone: string, code: string): Promise<{ message: string; verified: boolean }> {
  const res: any = await api.post('/auth/verify-otp', { phone, code });
  return res.data;
}

// ─── Mappers (backend → frontend types) ───
function mapProduct(p: any): Product {
  const rawVariants = p.variants || p.product_variants || [];
  const hasVariants = rawVariants.length > 0;
  const minPrice = hasVariants ? Math.min(...rawVariants.map((v: any) => v.price)) : p.price;
  return {
    id: p.id,
    name: p.name,
    price: minPrice,
    oldPrice: p.old_price || undefined,
    unit: p.unit || '/kg',
    shop: p.shop_name || '',
    voucher: undefined,
    rating: p.rating || 0,
    distance: p.distance || '',
    isFresh: p.is_fresh !== false,
    isOutOfStock: p.stock === 0 || p.is_out_of_stock,
    stock: Number(p.stock ?? 0),
    imageBg: p.image_bg || '#EAF8F7',
    emoji: p.emoji || '🦐',
    description: p.description || undefined,
    ratingCount: p.rating_count || undefined,
    soldCount: p.sold_count || undefined,
    images: p.images || [],
    categoryId: p.category_id,
    weight: p.weight || 1,
    variants: hasVariants ? rawVariants.map((v: any) => ({
      id: v.id,
      label: v.label,
      price: v.price,
      unit: v.unit,
      stock: Number(v.stock ?? 0),
    })) : undefined,
  };
}

function mapVoucher(v: any): Voucher {
  return {
    code: v.code,
    label: v.label,
    desc: v.description || '',
    type: v.type,
    value: v.type === 'percent' ? (v.value || 0) / 100 : v.value,
    cap: v.cap,
    icon: v.icon || '🏷️',
    minOrder: v.min_order,
  };
}

function mapOrder(o: any): Order {
  return {
    code: o.code,
    total: o.total,
    status: o.status,
    deliveryEstimate: o.delivery_time || '',
    driver: o.driver_name ? {
      name: o.driver_name,
      phone: o.driver_phone || '',
      plateNumber: o.driver_plate || '',
      rating: o.driver_rating || 0,
    } : undefined,
    items: o.items || [],
    subtotal: o.subtotal,
    discount: o.discount,
    shippingFee: o.shipping_fee,
    createdAt: o.created_at,
    address: o.address_snapshot || undefined,
    shippingTrackingCode: o.shipping_tracking_code || undefined,
  };
}

export default api;

// ─── Chat ───
export async function fetchConversations(): Promise<Conversation[]> {
  const res: any = await api.get('/chat/conversations');
  return res.data || [];
}

export async function createConversation(subject: string, message: string): Promise<Conversation> {
  const res: any = await api.post('/chat/conversations', { subject, message });
  return res.data;
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const res: any = await api.get(`/chat/conversations/${conversationId}/messages`);
  return res.data || [];
}

export async function sendMessage(conversationId: string, content: string, image_url?: string): Promise<Message> {
  const res: any = await api.post(`/chat/conversations/${conversationId}/messages`, { content, image_url });
  return res.data;
}

// ─── Videos ───
export async function fetchProductVideos(productId: string): Promise<ProductVideo[]> {
  const res: any = await api.get(`/products/${productId}/videos`);
  return res.data || [];
}

// ─── Shipping ───
export async function fetchShippingPartners(lat?: number, lng?: number, weight?: number, withFee?: boolean): Promise<ShippingPartner[]> {
  const res: any = await api.get('/shipping/partners', { params: { lat, lng, weight, with_fee: withFee ? '1' : '0' } });
  return res.data || [];
}

export async function fetchShippingFee(
  carrier: string,
  lat?: number,
  lng?: number,
  weight?: number,
  deliveryMode?: string | null,
): Promise<{ fee: number; estimatedDays: number; serviceName: string; carrier: string }[]> {
  const res: any = await api.post('/shipping/calculate', {
    carrier,
    toLat: lat,
    toLng: lng,
    weight,
    delivery_mode: deliveryMode,
  });
  return res.data || [];
}

// ─── Featured Videos (Home) ───
export async function fetchFeaturedVideos(): Promise<FeaturedVideo[]> {
  const res: any = await api.get('/products/videos');
  return (res.data || []).map((v: any) => ({
    id: v.id,
    url: v.url,
    thumbnail_url: v.thumbnail_url,
    duration: v.duration,
    title: v.title || v.product_name,
    views: v.views || 0,
    product_id: v.product_id,
    product_name: v.product_name,
    product_price: v.product_price,
    product_emoji: v.product_emoji,
    product_image_bg: v.product_image_bg,
    product_unit: v.product_unit,
    product_description: v.product_description,
    shop_id: v.shop_id,
    shop_name: v.shop_name,
    shop_phone: v.shop_phone,
  }));
}

export async function recordVideoView(videoId: string): Promise<void> {
  await api.post(`/products/videos/${videoId}/view`);
}

// ─── Video Comments ───
export async function fetchVideoComments(videoId: string): Promise<VideoComment[]> {
  const res: any = await api.get(`/products/videos/${videoId}/comments`);
  return res.data || [];
}

export async function postVideoComment(videoId: string, content: string, customerId?: string, customerName?: string, parentId?: string | null): Promise<VideoComment> {
  const res: any = await api.post(`/products/videos/${videoId}/comments`, { customer_id: customerId, customer_name: customerName, content, parent_id: parentId || null });
  return res.data;
}

export async function updateVideoComment(commentId: string, content: string): Promise<void> {
  await api.put(`/products/videos/comments/${commentId}`, { content });
}

export async function deleteVideoComment(commentId: string): Promise<void> {
  await api.delete(`/products/videos/comments/${commentId}`);
}

export async function toggleVideoLike(videoId: string, customerId: string): Promise<{ liked: boolean }> {
  const res: any = await api.post(`/products/videos/${videoId}/like`, { customer_id: customerId });
  return res.data;
}

export async function getVideoLikeStatus(videoId: string, customerId?: string): Promise<{ liked: boolean; count: number }> {
  const res: any = await api.get(`/products/videos/${videoId}/like`, { params: { customer_id: customerId } });
  return res.data;
}

export async function fetchSupport(): Promise<{
  hotline_display: string;
  hotline_tel: string;
  hours: string;
  zalo_url: string;
  email: string;
  office_address: string;
  faqs: { id: string; question: string; answer: string }[];
}> {
  const res: any = await api.get('/support');
  return res.data;
}
