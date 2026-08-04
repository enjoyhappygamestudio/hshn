# C-006 — API Integration

## API Client

```typescript
const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: attach token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: handle errors
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(normalizeError(error));
  }
);
```

## Error normalization

```typescript
function normalizeError(error: unknown): AppError {
  if (axios.isAxiosError(error)) {
    if (!error.response) return { code: 'NETWORK', message: 'Không có kết nối Internet' };
    const { status, data } = error.response;
    if (status === 404) return { code: 'NOT_FOUND', message: 'Không tìm thấy dữ liệu' };
    if (status >= 500) return { code: 'SERVER', message: 'Máy chủ tạm thời lỗi' };
    return { code: 'UNKNOWN', message: data?.message || 'Có lỗi xảy ra' };
  }
  return { code: 'UNKNOWN', message: 'Có lỗi xảy ra' };
}
```
