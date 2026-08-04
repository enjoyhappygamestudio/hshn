import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { success, error, pagination } from '../utils/response';
import { authenticate, AuthRequest } from '../middleware/auth';
import { trackShipOrder, cancelShipOrder } from '../services/carrier';
import { config } from '../config';

const router = Router();

// POST /api/orders — Tạo đơn hàng
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      items, subtotal, discount, shipping_fee, total,
      voucher_code, delivery_mode, delivery_date, delivery_time,
      payment_method, note, address_snapshot,
      invoice_requested, invoice_company_name, invoice_tax_code,
      invoice_company_address, invoice_email, invoice_representative,
      shipping_partner_id,
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json(error('Giỏ hàng trống'));
    }
    if (!delivery_mode) {
      return res.status(400).json(error('Vui lòng chọn thời gian giao hàng'));
    }
    if (!['hoatoc', 'express2h', 'interprovince', 'appointment'].includes(delivery_mode)) {
      return res.status(400).json(error('Thời gian giao hàng không hợp lệ'));
    }
    if (!payment_method) {
      return res.status(400).json(error('Vui lòng chọn phương thức thanh toán'));
    }

    // Enrich items with product images
    const productIds = items.map((i: any) => i.product_id).filter(Boolean);
    let imageMap: Record<string, string> = {};
    if (productIds.length > 0) {
      const imgResult = await query(
        `SELECT id, images FROM products WHERE id = ANY($1)`,
        [productIds],
      );
      for (const row of imgResult.rows) {
        if (row.images && row.images.length > 0) {
          imageMap[row.id] = row.images[0];
        }
      }
    }
    const enrichedItems = items.map((i: any) => ({
      ...i,
      image: i.image || imageMap[i.product_id] || '',
    }));

    const result = await query(`
      INSERT INTO orders (
        customer_id, status, items, subtotal, discount,
        shipping_fee, total, voucher_code, delivery_mode,
        delivery_date, delivery_time, payment_method, note, address_snapshot,
        invoice_requested, invoice_company_name, invoice_tax_code,
        invoice_company_address, invoice_email, invoice_representative,
        shipping_partner_id
      ) VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      req.customerId, JSON.stringify(enrichedItems), subtotal, discount,
      shipping_fee, total, voucher_code || null, delivery_mode,
      delivery_date || null, delivery_time || null, payment_method,
      note || null, JSON.stringify(address_snapshot),
      invoice_requested || false, invoice_company_name || null, invoice_tax_code || null,
      invoice_company_address || null, invoice_email || null, invoice_representative || null,
      shipping_partner_id || null,
    ]);

    const order = result.rows[0];

    // Log tracking — đơn chờ cửa hàng xác nhận (đủ hàng) trước khi tạo đơn vận chuyển
    await query(
      `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, 'pending', 'Đơn hàng đang chờ cửa hàng xác nhận')`,
      [order.id],
    );

    res.status(201).json(success(order));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/orders — Lịch sử đơn hàng của khách
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE o.customer_id = $1';
    const params: any[] = [req.customerId];

    if (status) {
      where += ' AND o.status = $2';
      params.push(status);
    }

    const countResult = await query(`SELECT COUNT(*) FROM orders o ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const sql = `
      SELECT o.*, d.name as driver_name, d.phone as driver_phone,
             d.plate_number as driver_plate, d.rating as driver_rating
      FROM orders o
      LEFT JOIN drivers d ON o.driver_id = d.id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limitNum, offset);

    const result = await query(sql, params);
    res.json(success(result.rows, pagination(pageNum, limitNum, total)));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/orders/:id — Chi tiết đơn hàng
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT o.*, d.name as driver_name, d.phone as driver_phone,
             d.plate_number as driver_plate, d.rating as driver_rating
      FROM orders o
      LEFT JOIN drivers d ON o.driver_id = d.id
      WHERE (o.id::text = $1 OR o.code = $1) AND o.customer_id = $2
    `, [id, req.customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy đơn hàng'));
    }

    const tracking = await query(
      `SELECT * FROM order_tracking WHERE order_id = $1 ORDER BY created_at DESC`,
      [result.rows[0].id],
    );

    res.json(success({ ...result.rows[0], tracking: tracking.rows }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/orders/:id/cancel — Hủy đơn hàng
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const reason = (req.body?.reason || 'Khách hàng muốn hủy đơn').toString();

    const result = await query(`
      SELECT o.* FROM orders o
      WHERE (o.id::text = $1 OR o.code = $1) AND o.customer_id = $2
    `, [id, req.customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy đơn hàng'));
    }

    const order = result.rows[0];
    if (!['pending', 'confirmed', 'hard_to_ship'].includes(order.status)) {
      return res.status(400).json(error('Không thể hủy đơn ở trạng thái này'));
    }

    // Hủy đơn vận chuyển trên AhaMove trước (nếu có) — chỉ khi chưa có tài xế nhận
    if (order.shipping_carrier && order.shipping_tracking_code) {
      const cancellableStatuses = ['ASSIGNING', 'IDLE', 'CONFIRMING', 'PAYING'];
      try {
        const live = await trackShipOrder(order.shipping_carrier, order.shipping_tracking_code);
        if (live.driver) {
          return res.status(400).json(error('Đã có tài xế nhận đơn, không thể hủy'));
        }
        if (live.status && !cancellableStatuses.includes(live.status)) {
          return res.status(400).json(error('Đơn vận chuyển đang chạy, không thể hủy'));
        }
      } catch {
        // Không lấy được trạng thái live → để AhaMove tự kiểm tra khi hủy
      }
      try {
        await cancelShipOrder(order.shipping_carrier, order.shipping_tracking_code, reason);
      } catch (cancelErr: any) {
        return res.status(400).json(error(cancelErr.message || 'Không thể hủy đơn vận chuyển'));
      }
    }

    const updated = await query(
      `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [order.id],
    );
    await query(
      `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, 'cancelled', $2)`,
      [order.id, `Đơn hàng đã bị hủy: ${reason}`],
    );

    res.json(success(updated.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/orders/:id/track — Real-time tracking
router.get('/:id/track', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT o.id, o.code, o.status, o.delivery_mode, o.delivery_date, o.delivery_time,
             o.address_snapshot,
             o.shipping_carrier, o.shipping_tracking_code, o.shipping_status,
             o.shipping_carrier_fee, o.shipping_error,
             d.id as driver_id, d.name as driver_name, d.phone as driver_phone,
             d.plate_number as driver_plate, d.rating as driver_rating,
             d.current_lat, d.current_lng
      FROM orders o
      LEFT JOIN drivers d ON o.driver_id = d.id
      WHERE (o.id::text = $1 OR o.code = $1) AND o.customer_id = $2
    `, [id, req.customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy đơn hàng'));
    }

    const order = result.rows[0];
    const isShopContact = order.status === 'hard_to_ship' || order.status === 'customer_refused';
    const base = {
      orderId: order.id,
      orderCode: order.code,
      orderStatus: order.status,
      deliveryMode: order.delivery_mode,
      deliveryDate: order.delivery_date,
      deliveryTime: order.delivery_time,
      addressSnapshot: order.address_snapshot,
      carrier: order.shipping_carrier || null,
      carrierTrackingCode: order.shipping_tracking_code || null,
      carrierStatus: order.shipping_status || null,
      carrierFee: order.shipping_carrier_fee || 0,
      carrierError: order.shipping_error || null,
      driver: isShopContact
        ? {
            id: 'shop',
            name: config.shipping.ahamove.shopName || 'Cửa hàng',
            phone: config.shipping.ahamove.shopPhone || '0936141757',
          }
        : {
            id: order.driver_id || undefined,
            name: order.driver_name || undefined,
            phone: order.driver_phone || undefined,
            plateNumber: order.driver_plate || undefined,
            rating: order.driver_rating || 0,
            currentLat: order.current_lat || undefined,
            currentLng: order.current_lng || undefined,
          },
    };

    let live: any = null;
    let liveError: string | null = null;
    if (order.shipping_carrier && order.shipping_tracking_code) {
      try {
        live = await trackShipOrder(order.shipping_carrier, order.shipping_tracking_code);
      } catch (err: any) {
        liveError = err.message || 'Không thể cập nhật vị trí tài xế';
      }
    }
    if (isShopContact) {
      live = {
        ...(live || {}),
        status: live?.status || 'ASSIGNING',
        statusText: order.status === 'hard_to_ship'
          ? 'Đơn khó đặt ship — chưa có tài xế nhận đơn'
          : 'Khách không nhận đơn — vui lòng liên hệ cửa hàng',
        driver: {
          name: config.shipping.ahamove.shopName || 'Cửa hàng',
          phone: config.shipping.ahamove.shopPhone || '0936141757',
        },
      };
    }

    const tracking = await query(
      `SELECT * FROM order_tracking WHERE order_id = $1 ORDER BY created_at DESC`,
      [order.id],
    );

    res.json(success({
      ...base,
      live,
      liveError,
      timeline: tracking.rows,
    }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

export default router;
