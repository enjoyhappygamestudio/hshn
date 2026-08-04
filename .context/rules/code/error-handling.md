# C-004 — Xử lý lỗi tập trung

## Error boundary

Component `ErrorBoundary` bọc toàn bộ app. Fallback UI hiển thị thông báo thân thiện + nút "Thử lại".

## API errors

```typescript
interface ApiError {
  code: string;
  message: string; // Tiếng Việt
  details?: Record<string, string>;
}

// Error handler hook
function useApiError() {
  const handleError = (error: unknown) => {
    if (error instanceof NetworkError) {
      return { message: 'Không có kết nối Internet', action: 'RETRY' };
    }
    if (error instanceof AuthError) {
      return { message: 'Phiên đăng nhập hết hạn', action: 'LOGIN' };
    }
    if (error instanceof ValidationError) {
      return { message: error.message, action: 'FIX_INPUT' };
    }
    return { message: 'Có lỗi xảy ra, vui lòng thử lại', action: 'RETRY' };
  };
}
```

## UI rules

- Hiển thị lỗi gần ngữ cảnh (dưới field, dưới section)
- Toast cho lỗi tạm thời
- Dialog cho lỗi cần xác nhận
- Alert cho lỗi nghiêm trọng
- Không hiển thị stack trace, mã lỗi kỹ thuật
