# C-010 — Blueprint cho mỗi màn hình

Mỗi màn hình trong app tuân theo blueprint sau:

## Yêu cầu bắt buộc

1. **3 trạng thái**: loading (skeleton), error (thông báo + thử lại), success (dữ liệu)
2. **Empty state**: khi không có dữ liệu
3. **Bottom nav**: cho các màn hình chính (Trang chủ, Danh mục, Đơn hàng, Tài khoản)
4. **Safe area**: chừa vùng an toàn cho notch, home indicator
5. **Pull-to-refresh**: cho danh sách
6. **Scroll**: nội dung cuộn được, thanh hành động cố định cuối

## Mẫu:

```typescript
function SomeScreen() {
  const { data, isLoading, error, refetch } = useQuery();

  if (isLoading) return <SkeletonLayout />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data || data.length === 0) return <EmptyState />;

  return (
    <ScreenContainer>
      <ScrollView>{/* nội dung */}</ScrollView>
      <BottomActionBar>{/* thanh hành động cố định */}</BottomActionBar>
      <BottomNav active="current" />
    </ScreenContainer>
  );
}
```

## Danh sách màn hình

| Màn hình | Loading | Empty | Error | Bottom nav | Action bar |
|---|---|---|---|---|---|
| Trang chủ | Skeleton categories + cards | Thông báo + Tải lại | Mạng + Thử lại | Có | Không |
| Danh mục | Skeleton grid | Thông báo + Tải lại | Mạng + Thử lại | Có | Không |
| Chi tiết SP | Skeleton detail | N/A | Mạng + Thử lại | Không | Thêm giỏ / Mua ngay |
| Giỏ hàng | Skeleton list | Ảnh + Tiếp tục mua | Mạng + Thử lại | Có | Thanh toán |
| Thanh toán | Skeleton | N/A | Mạng + Thử lại | Không | Đặt hàng |
| Xác nhận | Spinner | N/A | Lỗi đặt hàng | Không | Theo dõi / Mua tiếp |
| Theo dõi | Skeleton map | Đơn không tồn tại | Lỗi tải | Không | Về trang chủ |
| Tài khoản | Skeleton profile | N/A | Mạng + Thử lại | Có | Đăng xuất |
