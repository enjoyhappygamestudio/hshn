# C-009 — Style Guide

## Design tokens

```typescript
export const colors = {
  primary: '#078C86',      // Xanh biển ngọc
  primaryDark: '#066B66',
  navy: '#123A4A',          // Xanh đậm
  coral: '#FF7A59',         // Cam san hô
  coralDark: '#F0623E',
  white: '#FFFFFF',
  cream: '#FAF8F3',         // Trắng ngà
  mint: '#EAF8F7',          // Xanh rất nhạt
  line: '#E7ECEA',          // Viền
  muted: '#6B7A80',         // Xám
  danger: '#D64545',
  success: '#078C86',
};

export const typography = {
  display: 'Be Vietnam Pro',
  numeric: 'Inter',
};

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
};

export const shadows = {
  card: '0 6px 18px rgba(18,58,74,0.08)',
};
```

## Spacing

Sử dụng hệ thống spacing 4px: 4, 8, 12, 14, 16, 18, 20, 24, 32.
