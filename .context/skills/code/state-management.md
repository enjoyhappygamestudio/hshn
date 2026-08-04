# Skill: State management

## Kiến trúc

```
Zustand / Redux Toolkit + React Query

- React Query: server state (API calls, cache, refetch)
- Zustand/Redux: client state (cart, UI, auth)
```

## Cart store

```typescript
interface CartStore {
  items: CartItem[];
  voucher: Voucher | null;
  addItem: (product: Product, variant: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  applyVoucher: (voucher: Voucher | null) => void;
  clearCart: () => void;
  subtotal: () => number;
  discount: () => number;
  total: () => number;
}
```

## Checkout state

```typescript
interface CheckoutStore {
  deliveryMode: 'hoatoc' | 'schedule' | null;
  deliveryDate: string | null;
  deliveryTime: string | null;
  paymentMethod: 'cod' | 'wallet' | 'card' | null;
  note: string;
  setDelivery: (mode, date?, time?) => void;
  setPayment: (method) => void;
  validate: () => ValidationResult;
}
```
