# C-013 — Admin CRUD Pattern

## Component structure

```typescript
// List screen
function ProductListScreen() {
  const { data, isLoading, refetch } = useAdminProducts();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});

  if (isLoading) return <TableSkeleton />;

  return (
    <AdminLayout>
      <PageHeader title="Sản phẩm" action={<AddButton />} />
      <SearchBar value={search} onChange={setSearch} />
      <FilterBar filters={filters} onChange={setFilters} />
      <DataTable
        columns={[
          { key: 'name', label: 'Tên' },
          { key: 'price', label: 'Giá', render: money },
          { key: 'stock', label: 'Tồn kho' },
          { key: 'status', label: 'Trạng thái' },
        ]}
        data={data}
        onRowClick={(row) => navigate(`/admin/products/${row.id}`)}
        actions={(row) => (
          <RowActions onEdit={() => navigate(`/admin/products/${row.id}/edit`)} onDelete={() => confirmDelete(row.id)} />
        )}
        pagination
      />
    </AdminLayout>
  );
}

// Form screen
function ProductFormScreen({ productId }: { productId?: string }) {
  const { register, handleSubmit, watch } = useForm();
  const mutation = useMutation(productId ? updateProduct : createProduct);

  return (
    <AdminLayout>
      <PageHeader title={productId ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'} back />
      <Form onSubmit={handleSubmit}>
        <TextField label="Tên sản phẩm" {...register('name', { required: true })} />
        <NumberField label="Giá" {...register('price', { required: true })} />
        <SelectField label="Danh mục" options={categories} {...register('categoryId')} />
        <ImageUpload label="Ảnh" {...register('images')} />
        <Button type="submit" loading={mutation.isLoading}>Lưu</Button>
      </Form>
    </AdminLayout>
  );
}
```

## CRUD endpoints

| Method | Path | Action |
|---|---|---|
| GET | /api/admin/products | List |
| GET | /api/admin/products/:id | Detail |
| POST | /api/admin/products | Create |
| PUT | /api/admin/products/:id | Update |
| DELETE | /api/admin/products/:id | Delete |
