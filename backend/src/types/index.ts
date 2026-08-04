export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  old_price?: number;
  unit: string;
  shop_id: string;
  category_id: string;
  is_fresh: boolean;
  stock: number;
  images: string[];
  rating: number;
  rating_count: number;
  sold_count: number;
  shop_name?: string;
  category_name?: string;
  distance?: string;
  voucher?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  label: string;
  price: number;
  unit: string;
  stock: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  product_count: number;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  tier: string;
  order_count: number;
  created_at: string;
}

export interface Order {
  id: string;
  code: string;
  customer_id: string;
  status: 'pending' | 'confirmed' | 'hard_to_ship' | 'customer_refused' | 'delivered' | 'exchanged' | 'returned' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  voucher_code?: string;
  delivery_mode: 'hoatoc' | 'schedule';
  delivery_date?: string;
  delivery_time?: string;
  payment_method: string;
  note?: string;
  address_snapshot: AddressSnapshot;
  driver_id?: string;
  driver_name?: string;
  driver_phone?: string;
  driver_plate?: string;
  driver_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  variant: string;
  price: number;
  quantity: number;
  image: string;
}

export interface AddressSnapshot {
  name: string;
  phone: string;
  full: string;
}

export interface Voucher {
  id: string;
  code: string;
  label: string;
  description?: string;
  type: 'percent' | 'fixed' | 'shipping';
  value?: number;
  cap?: number;
  min_order?: number;
  max_uses?: number;
  current_uses: number;
  expires_at?: string;
  active: boolean;
  created_at: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  plate_number: string;
  avatar_url?: string;
  rating: number;
  status: 'available' | 'busy' | 'offline';
  current_lat?: number;
  current_lng?: number;
}

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
