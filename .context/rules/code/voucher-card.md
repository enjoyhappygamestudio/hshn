# C-012 — Component Voucher Card chuẩn

## Cấu trúc

```
[Icon] [Tên ưu đãi] [✓]
       [Điều kiện áp dụng]
```

## Props

```typescript
interface VoucherCardProps {
  voucher: {
    code: string;
    label: string;
    desc: string;
    type: 'percent' | 'fixed' | 'shipping';
    value?: number;
    cap?: number;
    icon: string;
  };
  isSelected: boolean;
  onSelect: (code: string) => void;
}
```

## Behavior

- Chạm để chọn / bỏ chọn
- Khi chọn: border xanh `#078C86`, background `#EAF8F7`, icon nền xanh
- Khi không chọn: border dashed `#E7ECEA`
- Toast "Đã áp dụng: {label}" khi chọn
- Toast "Đã bỏ chọn mã ưu đãi" khi bỏ
- Chỉ áp dụng 1 mã tại một thời điểm
