import { create } from 'zustand';
import { CartItem, Voucher, Product } from '../types';

interface CartStore {
  items: CartItem[];
  voucher: Voucher | null;

  addItem: (product: Product, variant: string, quantity: number, image?: string, unitPrice?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  applyVoucher: (v: Voucher | null) => void;

  count: () => number;
  subtotal: () => number;
  discount: () => number;
  shippingFee: () => number;
  shippingDiscount: () => number;
  total: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  voucher: null,

  addItem: (product, variant, quantity, image, unitPrice) => {
    const price = unitPrice ?? product.price;
    const existing = get().items.find(
      (i) => i.productId === product.id && i.variant === variant,
    );
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.productId === product.id && i.variant === variant
            ? { ...i, quantity: i.quantity + quantity, price }
            : i,
        ),
      });
    } else {
      set({
        items: [
          ...get().items,
          {
            productId: product.id,
            name: product.name,
            variant,
            price,
            quantity,
            emoji: product.emoji,
            imageBg: product.imageBg,
            image: image || product.images?.[0] || '',
            weight: product.weight || 1,
          },
        ],
      });
    }
  },

  removeItem: (productId) => {
    set({ items: get().items.filter((i) => i.productId !== productId) });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity < 1) return;
    set({
      items: get().items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i,
      ),
    });
  },

  clearCart: () => set({ items: [], voucher: null }),

  applyVoucher: (v) => set({ voucher: v }),

  count: () => get().items.reduce((s, i) => s + i.quantity, 0),
  subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),

  discount: () => {
    const v = get().voucher;
    if (!v) return 0;
    const sub = get().subtotal();
    if (v.type === 'percent') {
      const amount = Math.round(sub * (v.value || 0));
      return Math.min(amount, v.cap || Infinity);
    }
    if (v.type === 'fixed') return v.value || 0;
    return 0;
  },

  shippingFee: () => 20000,

  shippingDiscount: () => {
    const v = get().voucher;
    if (v && v.type === 'shipping') return get().shippingFee();
    return 0;
  },

  total: () => {
    const sub = get().subtotal();
    const disc = get().discount();
    const ship = get().shippingFee();
    const shipDisc = get().shippingDiscount();
    return Math.max(sub - disc + ship - shipDisc, 0);
  },
}));
