# C-003 — Modularity & Dependency Injection

## Package structure (Mobile)

```
src/
├── app/              # App entry, providers, navigation
├── screens/          # Screen components (1:1 với màn hình)
├── components/       # Shared components (ProductCard, VoucherCard...)
├── hooks/            # Custom hooks (useCart, useProducts...)
├── stores/           # State management (cart, checkout, auth)
├── services/         # API client, network layer
├── utils/            # Pure functions (format money, validate)
├── types/            # TypeScript type definitions
├── constants/        # Colors, typography, config
└── assets/           # Images, fonts
```

## Package structure (Admin)

```
src/admin/
├── screens/          # Admin screens
├── components/       # Admin shared components
├── hooks/            # Admin hooks
├── services/         # Admin API client
├── types/            # Admin types
└── Dashboard.tsx     # Dashboard entry
```

## DI Rules
- Services inject qua hooks, không new trực tiếp
- API client singleton, inject base URL từ env
- Stores độc lập, không phụ thuộc lẫn nhau
