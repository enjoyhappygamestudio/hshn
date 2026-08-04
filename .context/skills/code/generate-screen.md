# Skill: Tạo màn hình mới

## Steps

1. **Xác định screen type**: `home`, `product`, `cart`, `checkout`, `success`, `tracking`, `account`, `category`

2. **Tra cứu screen blueprint**: Đọc `rules/code/screen-blueprint.md` cho screen tương ứng

3. **Tạo component**:
   - 3 trạng thái: loading (skeleton), error, empty/success
   - Bottom action bar nếu có
   - ScrollView cho nội dung

4. **Data flow**:
   - Xác định API endpoints cần
   - Tạo React Query hooks
   - Tạo store actions nếu cần

5. **Navigation**:
   - Đăng ký route trong navigator
   - Xử lý deep link nếu cần

6. **Test**:
   - Unit test cho business logic
   - Integration test cho luồng

## File structure

```
src/screens/{Name}Screen/
├── index.tsx
├── components/
│   ├── {Name}Header.tsx
│   ├── {Name}List.tsx
│   └── {Name}Empty.tsx
├── use{Name}Data.ts
└── {Name}Screen.test.tsx
```
