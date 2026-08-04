# Skill: Tạo admin screen

## Pattern CRUD cho admin

Mỗi resource có 2 screens: **List** + **Form**

### List screen

```
[Header: Tên resource] [Nút + Thêm mới]
[Search bar] [Bộ lọc]
[Table: columns sortable, pagination]
[Row actions: Sửa, Xóa]
```

### Form screen

```
[Header: Thêm mới / Chỉnh sửa]
[Form fields với validation]
[Nút Lưu / Hủy]
```

## Resources cần tạo

| Resource | List | Form | Model |
|---|---|---|---|
| Sản phẩm | ProductList | ProductForm | name, price, variants, stock, images, category |
| Danh mục | CategoryList | CategoryForm | name, icon, productCount |
| Đơn hàng | OrderList | OrderDetail | code, status, items, total, delivery, customer |
| Khách hàng | CustomerList | CustomerDetail | name, phone, email, address, tier, orderCount |
| Voucher | VoucherList | VoucherForm | code, label, type, value, cap, condition, expiresAt |
| Ưu đãi | PromotionList | PromotionForm | title, description, image, link, active |
| Tài xế | DriverList | DriverForm | name, phone, plateNumber, rating, status |

## Dashboard

```
[Header: Thống kê]
[Card: Tổng đơn hôm nay, Doanh thu, Sản phẩm mới, Khách mới]
[Chart: Doanh thu 7 ngày]
[Table: Đơn hàng gần đây]
```
