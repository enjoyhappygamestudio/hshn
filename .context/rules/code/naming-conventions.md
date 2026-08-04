# C-002 — Quy tắc đặt tên

| Đối tượng | Convention | Ví dụ |
|---|---|---|
| Component | PascalCase | `ProductCard`, `CartScreen` |
| Hàm, biến | camelCase | `getProductById`, `cartItems` |
| Hằng số | UPPER_SNAKE_CASE | `MAX_QUANTITY`, `COLORS` |
| Type, Interface | PascalCase | `ProductType`, `CartItemProps` |
| File component | PascalCase | `ProductCard.tsx` |
| File non-component | camelCase | `useCartStore.ts`, `apiClient.ts` |
| Style object | camelCase | `styles.container` |
| Hook | useXxx | `useCart`, `useProductDetail` |
| Context | XxxContext | `CartContext` |
| Enum | PascalCase | `OrderStatus` |
| Enum member | UPPER_SNAKE_CASE | `OrderStatus.DELIVERED` |
| Test file | `*.test.ts` / `*.spec.ts` | `CartScreen.test.tsx` |

## Screen naming

```
src/screens/HomeScreen.tsx
src/screens/ProductDetailScreen.tsx
src/screens/CartScreen.tsx
src/screens/CheckoutScreen.tsx
src/screens/SuccessScreen.tsx
src/screens/TrackingScreen.tsx
src/screens/AccountScreen.tsx
```

## Admin screen naming

```
src/admin/screens/ProductListScreen.tsx
src/admin/screens/ProductFormScreen.tsx
src/admin/screens/OrderListScreen.tsx
src/admin/screens/OrderDetailScreen.tsx
src/admin/screens/CustomerListScreen.tsx
src/admin/screens/VoucherListScreen.tsx
src/admin/screens/DashboardScreen.tsx
```
