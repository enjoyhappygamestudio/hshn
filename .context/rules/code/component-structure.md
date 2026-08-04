# C-001 — Cấu trúc component chuẩn

Mỗi component tuân theo cấu trúc:

1. **Imports** — Thư viện, component con, hooks, types
2. **Types/Interfaces** — Props type, state type
3. **Component function** — Functional component với hooks
4. **Styled components** — (nếu dùng styled-components / StyleSheet)
5. **Export** — default export

```typescript
// 1. Imports
import { useCallback, useEffect } from 'react';
import { View, Text } from 'react-native';

// 2. Types
interface ProductCardProps {
  product: Product;
  onPress: (id: string) => void;
  onAddToCart: (product: Product) => void;
}

// 3. Component
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
}) => {
  // Hooks
  // Handlers
  // Render
};

// 4. Styles (đặt cuối file)
const styles = StyleSheet.create({ ... });
```

## Quy tắc
- Không `any`. Dùng `unknown` nếu chưa rõ kiểu.
- Mỗi component một file.
- Props phải có interface rõ ràng.
- Handler functions dùng `useCallback`.
- Tránh inline styles.
