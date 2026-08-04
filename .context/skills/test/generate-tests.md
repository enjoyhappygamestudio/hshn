# Skill: Tạo test

## Quy trình

1. Xác định module cần test
2. Tạo mock data (dùng factory functions)
3. Viết test cases bao phủ:
   - Happy path
   - Edge cases (empty, null, max/min)
   - Error cases
4. Chạy test, verify coverage

## Mock data factory

```typescript
export const makeProduct = (overrides?: Partial<Product>): Product => ({
  id: 'prod-1',
  name: 'Tôm sú tươi',
  price: 329000,
  unit: '/kg',
  shop: 'Hải Sản Hà Nội - Cầu Giấy',
  rating: 4.8,
  distance: '1.2 km',
  isFresh: true,
  isOutOfStock: false,
  ...overrides,
});
```

## Integration test pattern

```typescript
describe('Checkout flow', () => {
  it('hiển thị lỗi khi thiếu thông tin giao hàng', async () => {
    render(<CheckoutScreen />);
    await userEvent.press(screen.getByText('Đặt hàng'));
    expect(screen.getByText(/thời gian giao/i)).toBeVisible();
  });
});
```
