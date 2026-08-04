# C-007 — Performance

## Images
- Dùng `FastImage` (React Native) / `next/image` (Admin)
- Lazy load ngoài màn hình
- Cache ảnh với CDN URL
- Placeholder skeleton trong khi load

## Lists
- `FlatList` với `getItemLayout` cho danh sách lớn
- `windowSize` = 5, `maxToRenderPerBatch` = 10
- Pagination với React Query `keepPreviousData`

## Re-render
- `useMemo` cho computed values (tổng tiền, discount)
- `useCallback` cho handlers
- Tách component để tránh re-render parent

## Code splitting
- Admin web lazy load theo route
- Mobile không code split, tree-shake khi build
