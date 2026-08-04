# T-002 — Integration test

## Scope

Test luồng chính của ứng dụng:

1. **Mua hàng**: Home → Product Detail → Cart → Checkout → Success → Tracking
2. **Giỏ hàng**: Thêm sản phẩm, xóa, cập nhật số lượng, áp dụng voucher
3. **Thanh toán**: Validation thiếu thông tin, đặt hàng thành công
4. **Tài khoản**: Xem profile, logout

## Cấu trúc

```typescript
describe('Mua hàng flow', () => {
  beforeEach(() => {
    // Mock API responses
    server.use(
      rest.get('/api/products', (_, res, ctx) => res(ctx.json(mockProducts))),
      rest.post('/api/orders', (_, res, ctx) => res(ctx.json(mockOrder))),
    );
  });

  it('hoàn thành luồng mua hàng', async () => {
    render(<App />);
    // Tap product → add to cart → checkout → fill info → place order → success
  });
});
```
