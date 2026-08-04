# Implementation Plan: E-invoice / VAT Feature

## Phase 1: Database Migration
- Create `003_invoice_tables.sql` with:
  - `invoice_config` — company info + e-invoice provider settings
  - `invoice_rules` — auto-generation rules
  - `invoices` — invoice records linked to orders
  - Add invoice-related columns to `orders` table (invoice_request info)

## Phase 2: Backend API
- Create `src/routes/invoice.ts` — admin invoice endpoints:
  - `GET/PUT /api/admin/invoice/config` — company + provider config
  - `GET/PUT /api/admin/invoice/rules` — auto rules
  - `POST /api/admin/invoice/issue/:orderId` — manual issue
  - `GET /api/admin/invoices` — invoice history list
  - `GET /api/admin/invoices/:id` — invoice detail
  - `POST /api/admin/invoices/:id/retry` — retry failed
  - `POST /api/admin/invoices/:id/cancel` — cancel
  - `POST /api/admin/invoices/:id/resend-email` — resend
  - `GET/PUT /api/admin/orders/:id/invoice` — order invoice info

## Phase 3: Admin Frontend
- Add to sidebar: "Hóa đơn VAT" section with sub-items
- Invoice Settings page (company info + provider config)
- Invoice Rules page
- Invoice History page (list with filters)
- Update Order Detail page with invoice status section

## Phase 4: Mobile App
- Update CheckoutScreen: add "Yêu cầu xuất hóa đơn VAT" checkbox + fields
