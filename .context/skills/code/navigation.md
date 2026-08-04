# Skill: Navigation

## Route map

```typescript
type RootStackParamList = {
  Home: undefined;
  ProductDetail: { productId: string };
  Category: { categoryId?: string };
  Cart: undefined;
  Checkout: undefined;
  Success: { orderId: string };
  Tracking: { orderId: string };
  Account: undefined;
};

// Admin
type AdminStackParamList = {
  Dashboard: undefined;
  ProductList: undefined;
  ProductForm: { productId?: string };
  OrderList: undefined;
  OrderDetail: { orderId: string };
  CustomerList: undefined;
  CustomerDetail: { customerId: string };
  VoucherList: undefined;
  VoucherForm: { voucherId?: string };
};
```

## Flow guards

- Cart → Checkout: cần giỏ không trống
- Checkout → Success: cần validation pass
- Success → Tracking: cần orderId
- Auth gating: Admin screens yêu cầu đăng nhập
