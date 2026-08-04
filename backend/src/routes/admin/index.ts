import { Router, Request, Response } from 'express';
import multer from 'multer';
import { query } from '../../utils/db';
import { success, error, pagination } from '../../utils/response';
import { authenticate, requireAdmin, requireRole, AuthRequest } from '../../middleware/auth';
import { createShippingForOrder } from '../../services/orderShipping';
import { cancelShipOrder } from '../../services/carrier';
import { uploadBuffer, safeFilename, keyFromUrl, deleteObject } from '../../services/storage';
import { runBackup } from '../../services/backup';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'application/octet-stream'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Chỉ hỗ trợ MP4, WebM, MOV'));
  },
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Chỉ hỗ trợ JPG, PNG, WebP, GIF'));
  },
});

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Chỉ hỗ trợ PDF, Word, Excel, TXT, CSV'));
  },
});

const router = Router();

// ===== PRODUCTS =====
router.get('/products', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let where = '';
    const params: any[] = [];

    if (search) {
      where = 'WHERE LOWER(p.name) LIKE $1';
      params.push(`%${(search as string).toLowerCase()}%`);
    }

    const countResult = await query(`SELECT COUNT(*) FROM products p ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query(`
      SELECT p.*, s.name as shop_name, c.name as category_name
      FROM products p
      LEFT JOIN shops s ON p.shop_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limitNum, offset]);

    res.json(success(result.rows, pagination(pageNum, limitNum, total)));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.get('/products/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT p.*, s.name as shop_name, c.name as category_name
      FROM products p
      LEFT JOIN shops s ON p.shop_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy sản phẩm'));
    }
    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.get('/products/:id/variants', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sort_order, label',
      [id],
    );
    res.json(success(result.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.post('/products', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, old_price, unit, shop_id, category_id, stock, is_fresh, images, active, weight } = req.body;
    const result = await query(`
      INSERT INTO products (name, description, price, old_price, unit, shop_id, category_id, stock, is_fresh, images, active, weight)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [name, description, price ?? 0, old_price || null, unit || '/kg', shop_id || null, category_id, stock ?? 0, is_fresh !== false, images || '{}', active || false, weight != null && weight > 0 ? weight : 1]);

    res.status(201).json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.put('/products/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, old_price, unit, stock, is_fresh, active, images, category_id, weight } = req.body;

    const result = await query(`
      UPDATE products SET
        name = COALESCE($1, name), description = COALESCE($2, description),
        price = COALESCE($3, price), old_price = COALESCE($4, old_price),
        unit = COALESCE($5, unit), stock = COALESCE($6, stock),
        is_fresh = COALESCE($7, is_fresh), active = COALESCE($8, active),
        images = COALESCE($9, images), category_id = COALESCE($10, category_id),
        weight = COALESCE($12, weight),
        updated_at = NOW()
      WHERE id = $11 RETURNING *
    `, [name, description, price, old_price, unit, stock, is_fresh, active, images, category_id, id, weight != null && weight > 0 ? weight : null]);

    if (result.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy sản phẩm'));
    }
    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.delete('/products/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM products WHERE id = $1', [id]);
    res.json(success({ message: 'Đã xóa sản phẩm' }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ===== ORDERS =====
router.get('/orders', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let where = '';
    const params: any[] = [];

    if (status) {
      where = 'WHERE o.status = $1';
      params.push(status);
    }

    const countResult = await query(`SELECT COUNT(*) FROM orders o ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limitNum, offset]);

    res.json(success(result.rows, pagination(pageNum, limitNum, total)));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.put('/orders/:id/status', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, driver_id } = req.body;

    const validStatuses = ['pending', 'confirmed', 'hard_to_ship', 'customer_refused', 'delivered', 'exchanged', 'returned', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(error('Trạng thái không hợp lệ'));
    }

    // Nếu xác nhận đơn chưa có vận chuyển → tạo đơn vận chuyển thật (AhaMove)
    if (status === 'confirmed') {
      try {
        await createShippingForOrder(id);
      } catch (shipErr: any) {
        await query(
          `UPDATE orders SET shipping_error = $1, updated_at = NOW() WHERE id = $2`,
          [shipErr.message || 'Lỗi tạo đơn vận chuyển', id],
        );
        await query(
          `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, 'shipping_failed', $2)`,
          [id, shipErr.message || 'Không tạo được đơn vận chuyển'],
        );
      }
    }

    const updateFields: string[] = ['status = $1', 'updated_at = NOW()'];
    const params: any[] = [status];

    if (driver_id) {
      updateFields.push('driver_id = $2');
      params.push(driver_id);
    }

    params.push(id);
    const result = await query(`
      UPDATE orders SET ${updateFields.join(', ')} WHERE id = $${params.length} RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy đơn hàng'));
    }

    // Log tracking
    const statusLabels: Record<string, string> = {
      pending: 'Đơn hàng đang chờ xác nhận',
      confirmed: 'Đơn hàng đã được xác nhận',
      hard_to_ship: 'Đơn khó đặt ship — chưa có tài xế nhận đơn',
      customer_refused: 'Khách không nhận đơn',
      delivered: 'Đơn hàng đã hoàn thành',
      exchanged: 'Đơn hàng đổi hàng',
      returned: 'Đơn hàng bị trả hàng',
      cancelled: 'Đơn hàng đã bị hủy',
    };
    await query(
      `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, $2, $3)`,
      [id, status, statusLabels[status] || ''],
    );

    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/admin/orders/pending-count — Số đơn chờ xác nhận + đơn khó nhận ship (bắn alert cho admin)
router.get('/orders/pending-count', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM orders WHERE status = 'pending') as count,
         (SELECT COUNT(*)::int FROM orders WHERE status = 'hard_to_ship') as hard_ship`,
    );
    res.json(success({ count: result.rows[0].count, hardShipCount: result.rows[0].hard_ship }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/admin/orders/:id/confirm — Admin xác nhận đủ hàng → tạo đơn vận chuyển thật
router.post('/orders/:id/confirm', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const orderResult = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy đơn hàng'));
    }
    if (orderResult.rows[0].status !== 'pending') {
      return res.status(400).json(error('Đơn hàng không ở trạng thái chờ xác nhận'));
    }

    // Tạo đơn vận chuyển thật (AhaMove)
    try {
      await createShippingForOrder(id);
    } catch (shipErr: any) {
      await query(
        `UPDATE orders SET shipping_error = $1, updated_at = NOW() WHERE id = $2`,
        [shipErr.message || 'Lỗi tạo đơn vận chuyển', id],
      );
      await query(
        `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, 'shipping_failed', $2)`,
        [id, shipErr.message || 'Không tạo được đơn vận chuyển'],
      );
      return res.status(502).json(error(`Xác nhận thất bại: ${shipErr.message}`));
    }

    const result = await query(
      `UPDATE orders SET status = 'confirmed', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );
    await query(
      `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, 'confirmed', 'Cửa hàng đã xác nhận đủ hàng')`,
      [id],
    );

    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/admin/orders/:id/reject — Admin từ chối vì không đủ hàng
router.post('/orders/:id/reject', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const reason = (req.body?.reason || 'Cửa hàng không đủ hàng').toString();

    const orderResult = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy đơn hàng'));
    }
    if (orderResult.rows[0].status !== 'pending') {
      return res.status(400).json(error('Đơn hàng không ở trạng thái chờ xác nhận'));
    }

    const result = await query(
      `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );
    await query(
      `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, 'cancelled', $2)`,
      [id, `Cửa hàng từ chối đơn: ${reason}`],
    );

    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/admin/orders/:id/retry-shipping — Hủy vận chuyển cũ & tạo lại cho đơn khó nhận ship
router.post('/orders/:id/retry-shipping', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orderResult = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy đơn hàng'));
    }
    const order = orderResult.rows[0];
    if (order.status !== 'hard_to_ship') {
      return res.status(400).json(error('Chỉ hỗ trợ đơn ở trạng thái khó nhận ship'));
    }

    // Hủy đơn vận chuyển cũ trên AhaMove (nếu còn)
    if (order.shipping_carrier && order.shipping_tracking_code) {
      try {
        await cancelShipOrder(order.shipping_carrier, order.shipping_tracking_code, 'Cửa hàng hủy để đặt lại vận chuyển');
      } catch (cancelErr: any) {
        // Không chặn nếu AhaMove không hủy được (đơn đã hết hiệu lực)
        console.warn(`[retry-shipping] Hủy VC cũ thất bại: ${cancelErr.message}`);
      }
    }

    await query(
      `UPDATE orders SET shipping_tracking_code = NULL, shipping_status = NULL, shipping_carrier_fee = NULL,
         shipping_error = NULL, status = 'pending', updated_at = NOW() WHERE id = $1`,
      [id],
    );
    await query(
      `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, 'pending', 'Cửa hàng đặt lại vận chuyển — đơn quay lại chờ xác nhận')`,
      [id],
    );

    res.json(success({ ok: true, message: 'Đã hủy vận chuyển cũ, đơn quay lại chờ xác nhận' }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/admin/orders/:id/auto-reship — Tự đặt ship lại ngay cho đơn khó nhận ship (không quay về pending)
router.post('/orders/:id/auto-reship', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orderResult = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy đơn hàng'));
    }
    const order = orderResult.rows[0];
    if (order.status !== 'hard_to_ship') {
      return res.status(400).json(error('Chỉ hỗ trợ đơn ở trạng thái khó nhận ship'));
    }

    // Hủy đơn vận chuyển cũ trên AhaMove (nếu còn) — không chặn nếu hủy lỗi
    if (order.shipping_carrier && order.shipping_tracking_code) {
      try {
        await cancelShipOrder(order.shipping_carrier, order.shipping_tracking_code, 'Cửa hàng đặt lại vận chuyển (đơn khó nhận ship)');
      } catch (cancelErr: any) {
        console.warn(`[auto-reship] Hủy VC cũ thất bại: ${cancelErr.message}`);
      }
    }

    // Reset thông tin vận chuyển cũ rồi tạo mới
    await query(
      `UPDATE orders SET shipping_tracking_code = NULL, shipping_status = NULL, shipping_carrier_fee = NULL,
         shipping_error = NULL, updated_at = NOW() WHERE id = $1`,
      [id],
    );
    await query(
      `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, 'pending', 'Cửa hàng đặt lại vận chuyển tự động')`,
      [id],
    );

    try {
      await createShippingForOrder(id);
    } catch (shipErr: any) {
      await query(
        `UPDATE orders SET shipping_error = $1, status = 'hard_to_ship', updated_at = NOW() WHERE id = $2`,
        [shipErr.message || 'Lỗi tạo đơn vận chuyển', id],
      );
      await query(
        `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, 'shipping_failed', $2)`,
        [id, shipErr.message || 'Không tạo được đơn vận chuyển'],
      );
      return res.status(502).json(error(`Đặt lại vận chuyển thất bại: ${shipErr.message}`));
    }

    await query(
      `UPDATE orders SET status = 'confirmed', updated_at = NOW() WHERE id = $1`,
      [id],
    );
    await query(
      `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, 'confirmed', 'Cửa hàng đã tự đặt lại vận chuyển')`,
      [id],
    );

    const finalResult = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
    res.json(success({ ok: true, order: finalResult.rows[0], message: 'Đã đặt lại vận chuyển thành công' }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/admin/orders/:id — Chi tiết đơn hàng (khách + giao hàng + thanh toán)
router.get('/orders/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy đơn hàng'));
    }
    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ===== CUSTOMERS =====
router.get('/customers', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let where = '';
    const params: any[] = [];

    if (search) {
      where = 'WHERE LOWER(c.name) LIKE $1 OR c.phone LIKE $1';
      params.push(`%${(search as string).toLowerCase()}%`);
    }

    const countResult = await query(`SELECT COUNT(*) FROM customers c ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query(`
      SELECT c.id, c.name, c.phone, c.email, c.tier, c.order_count, c.created_at,
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) as total_orders
      FROM customers c
      ${where}
      ORDER BY c.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limitNum, offset]);

    res.json(success(result.rows, pagination(pageNum, limitNum, total)));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ===== VOUCHERS =====
router.get('/vouchers', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM vouchers ORDER BY created_at DESC');
    res.json(success(result.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.post('/vouchers', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { code, label, description, type, value, cap, min_order, max_uses, expires_at } = req.body;
    const result = await query(`
      INSERT INTO vouchers (code, label, description, type, value, cap, min_order, max_uses, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [code.toUpperCase(), label, description, type, value, cap, min_order || 0, max_uses, expires_at]);

    res.status(201).json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.put('/vouchers/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { label, description, type, value, cap, min_order, max_uses, expires_at, active } = req.body;

    const result = await query(`
      UPDATE vouchers SET
        label = COALESCE($1, label),
        description = COALESCE($2, description),
        type = COALESCE($3, type),
        value = COALESCE($4, value),
        cap = COALESCE($5, cap),
        min_order = COALESCE($6, min_order),
        max_uses = COALESCE($7, max_uses),
        expires_at = COALESCE($8, expires_at),
        active = COALESCE($9, active)
      WHERE id = $10 RETURNING *
    `, [label, description, type, value, cap, min_order, max_uses, expires_at || null, active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy voucher'));
    }
    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ===== DASHBOARD =====
router.get('/dashboard', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [ordersToday, revenueToday, totalProducts, totalCustomers, recentOrders] = await Promise.all([
      query(`SELECT COUNT(*)::int as count FROM orders WHERE created_at::date = $1`, [today]),
      query(`SELECT COALESCE(SUM(total), 0)::int as revenue FROM orders WHERE created_at::date = $1 AND status != 'cancelled'`, [today]),
      query(`SELECT COUNT(*)::int as count FROM products WHERE active = true`),
      query(`SELECT COUNT(*)::int as count FROM customers`),
      query(`SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id ORDER BY o.created_at DESC LIMIT 10`),
    ]);

    // Revenue chart (7 days)
    const revenue7Days = await query(`
      SELECT created_at::date as date, COALESCE(SUM(total), 0)::int as revenue
      FROM orders WHERE created_at >= NOW() - INTERVAL '7 days' AND status != 'cancelled'
      GROUP BY created_at::date ORDER BY date
    `);

    res.json(success({
      ordersToday: ordersToday.rows[0].count,
      revenueToday: revenueToday.rows[0].revenue,
      totalProducts: totalProducts.rows[0].count,
      totalCustomers: totalCustomers.rows[0].count,
      revenue7Days: revenue7Days.rows,
      recentOrders: recentOrders.rows,
    }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ===== INVENTORY (for inventory_staff role) =====
router.put('/products/:id/inventory', authenticate, requireRole('admin', 'staff', 'inventory_staff'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock < 0) {
      return res.status(400).json(error('Số lượng tồn kho không hợp lệ'));
    }

    const result = await query(
      `UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [stock, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy sản phẩm'));
    }
    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ===== VARIANTS =====
router.post('/products/:id/variants', authenticate, requireRole('admin', 'staff'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { label, price, unit, stock } = req.body;
    const result = await query(`
      INSERT INTO product_variants (product_id, label, price, unit, stock)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [id, label, price, unit, stock || 0]);
    res.status(201).json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.delete('/products/:id/variants/:variantId', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { variantId } = req.params;
    await query('DELETE FROM product_variants WHERE id = $1', [variantId]);
    res.json(success({ message: 'Đã xóa biến thể' }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ===== CATEGORIES =====
router.get('/categories', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY sort_order, name');
    res.json(success(result.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

export default router;

// ===== PRODUCT VIDEOS (admin) =====
router.get('/products/:id/videos', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT id, product_id, url, thumbnail_url, title, description, video_category, duration, sort_order, status, created_at FROM product_videos WHERE product_id = $1 ORDER BY sort_order ASC, created_at ASC',
      [req.params.id],
    );
    res.json(success(result.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.post('/products/:id/videos', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { url, thumbnail_url, title, description, video_category, duration, sort_order } = req.body;
    if (!url) return res.status(400).json(error('Vui lòng cung cấp URL video'));
    const result = await query(
      `INSERT INTO product_videos (product_id, url, thumbnail_url, title, description, video_category, duration, sort_order, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ready')
       RETURNING id, url, thumbnail_url, title, description, video_category, duration, sort_order, status`,
      [req.params.id, url, thumbnail_url || null, title || null, description || null, video_category || null, duration || 0, sort_order ?? 0],
    );
    res.status(201).json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.post('/products/:id/videos/upload', authenticate, requireAdmin, upload.single('video'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json(error('Vui lòng chọn file video'));
    const fileUrl = await uploadBuffer({
      bucket: 'media',
      key: `videos/${Date.now()}-${safeFilename(req.file.originalname)}`,
      body: req.file.buffer,
      contentType: req.file.mimetype || 'video/mp4',
    });
    const { title, description, video_category, sort_order } = req.body;
    const result = await query(
      `INSERT INTO product_videos (product_id, url, thumbnail_url, title, description, video_category, duration, sort_order, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ready')
       RETURNING id, url, thumbnail_url, title, description, video_category, duration, sort_order, status`,
      [req.params.id, fileUrl, null, title || null, description || null, video_category || null, 0, sort_order ?? 0],
    );
    res.status(201).json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.put('/products/videos/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, video_category, sort_order, url } = req.body;
    const result = await query(
      `UPDATE product_videos SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        video_category = COALESCE($3, video_category),
        sort_order = COALESCE($4, sort_order),
        url = COALESCE($5, url)
       WHERE id = $6 RETURNING *`,

      [title ?? null, description ?? null, video_category ?? null, sort_order ?? null, url ?? null, req.params.id],
    );
    if (result.rows.length === 0) return res.status(404).json(error('Không tìm thấy video'));
    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.put('/products/videos/:id/upload', authenticate, requireAdmin, upload.single('video'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, video_category, sort_order } = req.body;
    let fileUrl: string | null = null;
    let oldUrl: string | null = null;
    if (req.file) {
      const old = await query('SELECT url FROM product_videos WHERE id = $1', [req.params.id]);
      oldUrl = old.rows[0]?.url || null;
      fileUrl = await uploadBuffer({
        bucket: 'media',
        key: `videos/${Date.now()}-${safeFilename(req.file.originalname)}`,
        body: req.file.buffer,
        contentType: req.file.mimetype || 'video/mp4',
      });
    }
    const result = await query(
      `UPDATE product_videos SET
        url = COALESCE($1, url),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        video_category = COALESCE($4, video_category),
        sort_order = COALESCE($5, sort_order)
       WHERE id = $6 RETURNING *`,
      [fileUrl, title ?? null, description ?? null, video_category ?? null,
       sort_order != null ? parseInt(sort_order as string, 10) : null, req.params.id],
    );
    if (result.rows.length === 0) return res.status(404).json(error('Không tìm thấy video'));
    if (fileUrl && oldUrl && oldUrl !== fileUrl) {
      const key = keyFromUrl(oldUrl);
      if (key) await deleteObject('media', key);
    }
    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.delete('/products/videos/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const old = await query('SELECT url FROM product_videos WHERE id = $1', [req.params.id]);
    const oldUrl = old.rows[0]?.url || null;
    await query('DELETE FROM product_videos WHERE id = $1', [req.params.id]);
    if (oldUrl) {
      const key = keyFromUrl(oldUrl);
      if (key) await deleteObject('media', key);
    }
    res.json(success({ message: 'Đã xóa video' }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ===== MEDIA UPLOAD (ảnh) =====
router.post('/upload/image', authenticate, requireAdmin, imageUpload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json(error('Vui lòng chọn file ảnh'));
    const fileUrl = await uploadBuffer({
      bucket: 'media',
      key: `images/${Date.now()}-${safeFilename(req.file.originalname)}`,
      body: req.file.buffer,
      contentType: req.file.mimetype || 'image/jpeg',
    });
    res.status(201).json(success({ url: fileUrl }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ===== DOCUMENT UPLOAD (tài liệu → bucket hsb-documents) =====
router.post('/upload/document', authenticate, requireAdmin, documentUpload.single('document'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json(error('Vui lòng chọn file tài liệu'));
    const datePart = new Date().toISOString().slice(0, 10);
    const fileUrl = await uploadBuffer({
      bucket: 'documents',
      key: `documents/${datePart}/${Date.now()}-${safeFilename(req.file.originalname)}`,
      body: req.file.buffer,
      contentType: req.file.mimetype || 'application/octet-stream',
    });
    res.status(201).json(success({ url: fileUrl }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ===== BACKUP (cơ chế sao lưu → bucket hsb-backups) =====
router.post('/backups', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await runBackup();
    res.json(success(result));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// ===== SHIPPING PARTNERS (admin) =====
router.get('/shipping/partners', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT id, name, description, logo, api_endpoint, api_key, base_fee, fee_per_km, fee, estimated_days, active, sort_order, min_fee, max_fee, created_at FROM shipping_partners ORDER BY sort_order ASC',
    );
    res.json(success(result.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.post('/shipping/partners', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, logo, api_endpoint, api_key, base_fee, fee_per_km, fee, estimated_days, min_fee, max_fee, active, sort_order } = req.body;
    if (!name) return res.status(400).json(error('Vui lòng nhập tên đối tác'));
    const result = await query(
      `INSERT INTO shipping_partners (name, description, logo, api_endpoint, api_key, base_fee, fee_per_km, fee, estimated_days, min_fee, max_fee, active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, description || null, logo || '🚚', api_endpoint || null, api_key || null,
       base_fee || 15000, fee_per_km || 5000, fee || 30000, estimated_days || 1,
       min_fee || 10000, max_fee || 50000, active !== false, sort_order || 0],
    );
    res.status(201).json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.put('/shipping/partners/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, logo, api_endpoint, api_key, base_fee, fee_per_km, fee, estimated_days, min_fee, max_fee, active, sort_order } = req.body;
    const result = await query(
      `UPDATE shipping_partners SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        logo = COALESCE($3, logo),
        api_endpoint = COALESCE($4, api_endpoint),
        api_key = COALESCE($5, api_key),
        base_fee = COALESCE($6, base_fee),
        fee_per_km = COALESCE($7, fee_per_km),
        fee = COALESCE($8, fee),
        estimated_days = COALESCE($9, estimated_days),
        min_fee = COALESCE($10, min_fee),
        max_fee = COALESCE($11, max_fee),
        active = COALESCE($12, active),
        sort_order = COALESCE($13, sort_order)
       WHERE id = $14 RETURNING *`,
      [name ?? null, description ?? null, logo ?? null, api_endpoint ?? null, api_key ?? null,
       base_fee ?? null, fee_per_km ?? null, fee ?? null, estimated_days ?? null,
       min_fee ?? null, max_fee ?? null, active !== undefined ? active : null, sort_order ?? null, req.params.id],
    );
    if (result.rows.length === 0) return res.status(404).json(error('Không tìm thấy'));
    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

router.delete('/shipping/partners/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM shipping_partners WHERE id = $1', [req.params.id]);
    res.json(success({ message: 'Đã xóa đối tác' }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});
