# Skill: Tạo API spec

## OpenAPI spec mẫu

```yaml
openapi: 3.0.0
info:
  title: Hải Sản Hà Nội API
  version: 1.0.0

paths:
  /products:
    get:
      summary: Danh sách sản phẩm
      parameters:
        - name: category
          in: query
          schema: { type: string }
        - name: page
          in: query
          schema: { type: integer, default: 1 }
        - name: limit
          in: query
          schema: { type: integer, default: 20 }
      responses:
        200:
          description: Thành công
          content:
            application/json:
              schema:
                type: object
                properties:
                  data: { $ref: '#/components/schemas/Product' }
                  pagination: { $ref: '#/components/schemas/Pagination' }

  /orders:
    post:
      summary: Tạo đơn hàng
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
    get:
      summary: Lịch sử đơn hàng

  /orders/{id}/track:
    get:
      summary: Trạng thái đơn hàng real-time

  /vouchers:
    get:
      summary: Danh sách voucher khả dụng

  /auth/login:
    post:
      summary: Đăng nhập
```

## TypeScript types

```typescript
// Generated from OpenAPI spec
interface Product { ... }
interface Order { ... }
interface Voucher { ... }
interface Pagination { page: number; limit: number; total: number; }
```
