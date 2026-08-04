# T-001 — Unit test tiêu chuẩn

## Bắt buộc cho

- Business logic (tính giá, discount, phí ship)
- Hooks (useCart, useVoucher)
- Utils (format money, validate delivery)
- Store actions

## Cấu trúc test file

```typescript
describe('CartStore', () => {
  describe('addToCart', () => {
    it('thêm sản phẩm mới vào giỏ', () => { ... });
    it('tăng số lượng nếu sản phẩm đã tồn tại', () => { ... });
    it('không vượt quá tồn kho', () => { ... });
  });

  describe('applyVoucher', () => {
    it('áp dụng percent voucher đúng', () => { ... });
    it('áp dụng fixed voucher đúng', () => { ... });
    it('áp dụng shipping voucher đúng', () => { ... });
    it('không vượt quá cap', () => { ... });
  });
});
```

## Coverage target
- Business logic: 100%
- Components: 80%
- Screens: 70%
