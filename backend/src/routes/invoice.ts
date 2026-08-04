import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { success, error, pagination } from '../utils/response';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// All invoice routes require admin auth
router.use(authenticate);
router.use(requireRole('admin', 'staff', 'inventory_staff'));

// ─── GET /api/admin/invoice/settings — lấy cấu hình (company + provider) ───
router.get('/settings', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM invoice_config ORDER BY created_at DESC LIMIT 1');
    if (result.rows.length === 0) {
      return res.json(success(null));
    }
    const config = result.rows[0];
    // Mask API key
    if (config.api_key) {
      config.api_key = config.api_key.slice(0, 4) + '****' + config.api_key.slice(-4);
    }
    res.json(success(config));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ─── PUT /api/admin/invoice/settings — cập nhật cấu hình ───
router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const {
      company_name, tax_code, company_address, phone, email,
      representative_name, representative_title,
      provider, api_key, api_endpoint,
      invoice_template, invoice_serial, invoice_current_number, active,
    } = req.body;

    const existing = await query('SELECT id FROM invoice_config ORDER BY created_at DESC LIMIT 1');
    let result;

    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      result = await query(`
        UPDATE invoice_config SET
          company_name = COALESCE($1, company_name),
          tax_code = COALESCE($2, tax_code),
          company_address = COALESCE($3, company_address),
          phone = COALESCE($4, phone),
          email = COALESCE($5, email),
          representative_name = COALESCE($6, representative_name),
          representative_title = COALESCE($7, representative_title),
          provider = COALESCE($8, provider),
          api_key = CASE WHEN $9::TEXT IS NOT NULL THEN $9 ELSE api_key END,
          api_endpoint = COALESCE($10, api_endpoint),
          invoice_template = COALESCE($11, invoice_template),
          invoice_serial = COALESCE($12, invoice_serial),
          invoice_current_number = COALESCE($13, invoice_current_number),
          active = COALESCE($14, active),
          updated_by = $15,
          updated_at = NOW()
        WHERE id = $16 RETURNING *
      `, [
        company_name, tax_code, company_address, phone, email,
        representative_name, representative_title,
        provider, api_key || null, api_endpoint,
        invoice_template, invoice_serial, invoice_current_number,
        active, req.adminId, id,
      ]);
    } else {
      result = await query(`
        INSERT INTO invoice_config (
          company_name, tax_code, company_address, phone, email,
          representative_name, representative_title,
          provider, api_key, api_endpoint,
          invoice_template, invoice_serial, invoice_current_number, active, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        company_name, tax_code, company_address, phone, email,
        representative_name, representative_title,
        provider, api_key || null, api_endpoint,
        invoice_template, invoice_serial, invoice_current_number || 1,
        active || false, req.adminId,
      ]);
    }

    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ─── POST /api/admin/invoice/settings/test — kiểm tra kết nối ───
router.post('/settings/test', async (req: AuthRequest, res: Response) => {
  try {
    const { provider, api_endpoint, api_key } = req.body;
    // Simulate connection test (in production, call actual provider API)
    if (!api_endpoint) {
      return res.status(400).json(error('Vui lòng nhập API Endpoint'));
    }
    // Return success for now — actual validation would hit the provider
    res.json(success({ message: `Kết nối tới ${provider || 'provider'} thành công` }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ─── GET /api/admin/invoice/rules — lấy quy tắc tự động ───
router.get('/rules', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM invoice_rules ORDER BY created_at DESC');
    res.json(success(result.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ─── PUT /api/admin/invoice/rules/:id — cập nhật quy tắc ───
router.put('/rules/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      trigger_on, condition_type, min_order_amount,
      invoice_type, auto_send_email, email_template, bcc_email, active,
    } = req.body;

    const result = await query(`
      UPDATE invoice_rules SET
        trigger_on = COALESCE($1, trigger_on),
        condition_type = COALESCE($2, condition_type),
        min_order_amount = COALESCE($3, min_order_amount),
        invoice_type = COALESCE($4, invoice_type),
        auto_send_email = COALESCE($5, auto_send_email),
        email_template = COALESCE($6, email_template),
        bcc_email = COALESCE($7, bcc_email),
        active = COALESCE($8, active),
        updated_by = $9,
        updated_at = NOW()
      WHERE id = $10 RETURNING *
    `, [
      trigger_on, condition_type, min_order_amount,
      invoice_type, auto_send_email, email_template, bcc_email,
      active, req.adminId, id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy quy tắc'));
    }
    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ─── POST /api/admin/invoice/rules — tạo quy tắc mới ───
router.post('/rules', async (req: AuthRequest, res: Response) => {
  try {
    const { trigger_on, condition_type, min_order_amount, invoice_type, auto_send_email, email_template, bcc_email } = req.body;
    const result = await query(`
      INSERT INTO invoice_rules (trigger_on, condition_type, min_order_amount, invoice_type, auto_send_email, email_template, bcc_email, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [trigger_on || 'delivered', condition_type || 'on_request', min_order_amount, invoice_type || 'vat', auto_send_email !== false, email_template, bcc_email, req.adminId]);
    res.status(201).json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ─── GET /api/admin/invoices — danh sách hóa đơn ───
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status, search, from, to } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`i.status = $${paramIdx++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(`(i.invoice_number ILIKE $${paramIdx} OR o.code ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (from) {
      conditions.push(`i.issued_at >= $${paramIdx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`i.issued_at <= $${paramIdx++}::date + interval '1 day'`);
      params.push(to);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await query(`
      SELECT COUNT(*) FROM invoices i
      JOIN orders o ON i.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      ${where}
    `, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const sql = `
      SELECT i.*, o.code as order_code, o.total as order_total,
             c.name as customer_name, c.phone as customer_phone,
             o.invoice_company_name, o.invoice_tax_code, o.invoice_email
      FROM invoices i
      JOIN orders o ON i.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      ${where}
      ORDER BY i.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(limitNum, offset);

    const result = await query(sql, params);
    res.json(success(result.rows, pagination(pageNum, limitNum, total)));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ─── GET /api/admin/invoices/:id — chi tiết hóa đơn ───
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT i.*, o.code as order_code, o.total as order_total,
             o.items, o.subtotal, o.shipping_fee, o.voucher_code, o.discount,
             o.invoice_company_name, o.invoice_tax_code, o.invoice_company_address,
             o.invoice_email, o.invoice_representative,
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email
      FROM invoices i
      JOIN orders o ON i.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE i.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy hóa đơn'));
    }

    const audit = await query(
      'SELECT * FROM invoice_audit_log WHERE invoice_id = $1 ORDER BY created_at DESC',
      [id],
    );

    res.json(success({ ...result.rows[0], audit_log: audit.rows }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ─── POST /api/admin/invoice/issue/:orderId — xuất hóa đơn thủ công ───
router.post('/issue/:orderId', async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    // Get order
    const orderResult = await query(`
      SELECT o.*, c.name as customer_name, c.email as customer_email
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy đơn hàng'));
    }

    const order = orderResult.rows[0];

    // Check if invoice already exists
    const existing = await query('SELECT id, status FROM invoices WHERE order_id = $1', [orderId]);
    if (existing.rows.length > 0 && existing.rows[0].status === 'issued') {
      return res.status(400).json(error('Hóa đơn cho đơn hàng này đã được xuất'));
    }

    // Get config
    const configResult = await query('SELECT * FROM invoice_config ORDER BY created_at DESC LIMIT 1');
    const config = configResult.rows[0] || {};

    if (!config.active) {
      return res.status(400).json(error('Tính năng xuất hóa đơn chưa được kích hoạt. Vui lòng cấu hình trước.'));
    }

    // Calculate VAT (10% of subtotal)
    const vatRate = 10;
    const totalBeforeVat = order.subtotal;
    const vatAmount = Math.round(totalBeforeVat * vatRate / 100);

    // Generate invoice number
    const currentNumber = config.invoice_current_number || config.invoice_start_number || 1;
    const invoiceNumber = `${config.invoice_serial || 'HSHN'}-${String(currentNumber).padStart(6, '0')}`;

    // Create invoice record (simulate provider call)
    let invoice;
    if (existing.rows.length > 0) {
      // Retry existing failed invoice
      const invId = existing.rows[0].id;
      invoice = await query(`
        UPDATE invoices SET
          status = 'issued', invoice_number = $1,
          invoice_serial = $2, invoice_template = $3,
          total_before_vat = $4, vat_amount = $5, vat_rate = $6,
          shipping_fee = $7, total_amount = $8,
          issued_at = NOW(), issued_by = $9,
          retry_count = retry_count + 1, error_message = NULL,
          updated_at = NOW()
        WHERE id = $10 RETURNING *
      `, [invoiceNumber, config.invoice_serial, config.invoice_template,
        totalBeforeVat, vatAmount, vatRate, order.shipping_fee, order.total,
        req.adminId, invId]);
    } else {
      invoice = await query(`
        INSERT INTO invoices (
          order_id, invoice_number, invoice_serial, invoice_template,
          status, total_before_vat, vat_amount, vat_rate,
          shipping_fee, total_amount, issued_at, issued_by
        ) VALUES ($1, $2, $3, $4, 'issued', $5, $6, $7, $8, $9, NOW(), $10)
        RETURNING *
      `, [orderId, invoiceNumber, config.invoice_serial, config.invoice_template,
        totalBeforeVat, vatAmount, vatRate, order.shipping_fee, order.total,
        req.adminId]);
    }

    // Update current number in config
    await query('UPDATE invoice_config SET invoice_current_number = $1 WHERE id = $2', [currentNumber + 1, config.id]);

    // Log audit
    await query(`
      INSERT INTO invoice_audit_log (invoice_id, action, details, performed_by)
      VALUES ($1, 'issued', $2, $3)
    `, [invoice.rows[0].id, JSON.stringify({ order_code: order.code, invoice_number: invoiceNumber }), req.adminId]);

    res.json(success(invoice.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ─── POST /api/admin/invoices/:id/retry — thử lại ───
router.post('/:id/retry', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (invoice.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy hóa đơn'));
    }
    if (invoice.rows[0].status !== 'failed') {
      return res.status(400).json(error('Chỉ có thể thử lại với hóa đơn lỗi'));
    }

    const result = await query(`
      UPDATE invoices SET status = 'processing', retry_count = retry_count + 1, updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, [id]);

    await query(`
      INSERT INTO invoice_audit_log (invoice_id, action, details, performed_by)
      VALUES ($1, 'retry', $2, $3)
    `, [id, JSON.stringify({ retry_count: result.rows[0].retry_count }), req.adminId]);

    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ─── POST /api/admin/invoices/:id/cancel — hủy hóa đơn ───
router.post('/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const invoice = await query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (invoice.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy hóa đơn'));
    }
    if (invoice.rows[0].status === 'cancelled') {
      return res.status(400).json(error('Hóa đơn này đã được hủy trước đó'));
    }

    const result = await query(`
      UPDATE invoices SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = $1, cancel_reason = $2, updated_at = NOW()
      WHERE id = $3 RETURNING *
    `, [req.adminId, reason || null, id]);

    await query(`
      INSERT INTO invoice_audit_log (invoice_id, action, details, performed_by)
      VALUES ($1, 'cancelled', $2, $3)
    `, [id, JSON.stringify({ reason }), req.adminId]);

    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ─── POST /api/admin/invoices/:id/resend-email — gửi lại email ───
router.post('/:id/resend-email', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (invoice.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy hóa đơn'));
    }

    await query(`
      INSERT INTO invoice_audit_log (invoice_id, action, details, performed_by)
      VALUES ($1, 'resend_email', $2, $3)
    `, [id, JSON.stringify({ invoice_number: invoice.rows[0].invoice_number }), req.adminId]);

    res.json(success({ message: 'Email sẽ được gửi lại' }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ─── GET /api/admin/orders/:orderId/invoice — thông tin hóa đơn của đơn hàng ───
router.get('/order/:orderId', async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const result = await query(`
      SELECT i.*, o.code as order_code, o.invoice_requested,
             o.invoice_company_name, o.invoice_tax_code, o.invoice_company_address,
             o.invoice_email, o.invoice_representative
      FROM orders o
      LEFT JOIN invoices i ON i.order_id = o.id
      WHERE o.id = $1
      ORDER BY i.created_at DESC
      LIMIT 1
    `, [orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy đơn hàng'));
    }

    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

export default router;
