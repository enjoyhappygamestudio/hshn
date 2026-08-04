# C-005 — State management

## Phân loại state

| Loại | Công nghệ | Ví dụ |
|---|---|---|
| Server state | React Query | products, orders, vouchers |
| Client state | Zustand | cart, checkout, UI |
| Auth state | Zustand + SecureStore | token, user profile |
| Form state | React Hook Form | checkout form, search |

## React Query patterns

```typescript
// Query key factory
const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

// Custom hook
function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => productApi.getProducts(filters),
    staleTime: 5 * 60 * 1000, // 5 phút
  });
}
```

## Zustand store pattern

```typescript
interface CartState {
  items: CartItem[];
  voucher: Voucher | null;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  applyVoucher: (v: Voucher | null) => void;
  total: () => number;
}

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      voucher: null,
      addItem: (item) => set((s) => ({ items: [...s.items, item] })),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      applyVoucher: (v) => set({ voucher: v }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
    }),
    { name: 'cart-storage' }
  )
);
```
