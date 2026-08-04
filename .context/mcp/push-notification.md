# MCP: Push Notification

## Firebase Cloud Messaging

- Android: FCM
- iOS: APNs (qua FCM)

## Notification schemas

```typescript
// Order update
{
  title: 'Đơn hàng đã được xác nhận',
  body: `Mã đơn #${orderCode} đang được chuẩn bị`,
  data: { screen: 'Tracking', orderId: '...' },
}

// Driver assigned
{
  title: 'Tài xế đang đến',
  body: `Tài xế ${driverName} sẽ giao đơn #${orderCode}`,
  data: { screen: 'Tracking', orderId: '...' },
}

// Promotion
{
  title: 'Khuyến mãi mới',
  body: 'Giảm 10% cho đơn hàng tiếp theo',
  data: { screen: 'Home' },
}
```
