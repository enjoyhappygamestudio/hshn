# C-014 — Pattern thời gian giao hàng

## User flow

1. User chọn giữa **Hỏa tốc** hoặc **Chọn ngày giờ giao**
2. Hỏa tốc: phụ phí +15.000đ, giao trong 30p–1h
3. Chọn ngày giờ: hiện date picker + time slot picker
4. Phí giao hàng cập nhật theo lựa chọn
5. Validate: bắt buộc chọn đủ trước khi đặt hàng

## State

```typescript
interface DeliveryState {
  mode: 'hoatoc' | 'schedule' | null;
  date: string | null;      // ISO date
  timeSlot: string | null;  // '08-10' | '10-12' | '14-16' | '16-18' | '18-20'
}

const TIME_SLOTS = [
  { value: '08-10', label: '08:00 - 10:00' },
  { value: '10-12', label: '10:00 - 12:00' },
  { value: '14-16', label: '14:00 - 16:00' },
  { value: '16-18', label: '16:00 - 18:00' },
  { value: '18-20', label: '18:00 - 20:00' },
];
```

## Validation

```typescript
function deliveryIsValid(state: DeliveryState): boolean {
  if (state.mode === 'hoatoc') return true;
  if (state.mode === 'schedule') return !!(state.date && state.timeSlot);
  return false;
}
```

## UI rules

- Date picker không cho chọn ngày quá khứ
- Danh sách khung giờ tương ứng dropdown
- Cảnh báo hiển thị ngay dưới khối thời gian giao
- Tự động cuộn tới vị trí lỗi
