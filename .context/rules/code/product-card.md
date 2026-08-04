# C-011 — Component Product Card chuẩn

## Thứ tự hiển thị (từ trên xuống)

1. **Ảnh sản phẩm** — gradient + emoji background
   - Nhãn "Tươi" (chấm nhấp nháy xanh) nếu còn hàng
   - Nhãn % giảm giá nếu có khuyến mại
   - Lớp mờ + "Hết hàng" nếu hết
2. **Tên sản phẩm** — tối đa 2 dòng
3. **Tên shop** — kèm 🏪, rút gọn 1 dòng
4. **Mã giảm giá tốt nhất** — nhãn cam nhạt, ẩn nếu không có
5. **Đánh giá sao & khoảng cách** — ⭐ 4.8 · 📍 1.2 km
6. **Giá bán, giá gốc gạch ngang, đơn vị**
7. **Nút "+ Thêm giỏ"** / "Tạm hết hàng"

## Props type

```typescript
interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    oldPrice?: number;
    unit: string;
    shop: string;
    voucher?: string;
    rating: number;
    distance: string;
    isFresh?: boolean;
    isOutOfStock?: boolean;
    image: string;
  };
  onPress: (id: string) => void;
  onAddToCart: (product: Product) => void;
}
```

## Behavior

- `onPress` → mở chi tiết sản phẩm
- `+ Thêm giỏ` → toast "Đã thêm vào giỏ hàng", cập nhật badge
- Hết hàng → disabled button, "Tạm hết hàng"
- Giá = 0 → hiển thị "Liên hệ"
