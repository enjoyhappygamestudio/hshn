import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { success, error } from '../utils/response';

const router = Router();

// GET /api/vouchers — Danh sách voucher khả dụng
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT * FROM vouchers
      WHERE active = true
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (max_uses IS NULL OR current_uses < max_uses)
      ORDER BY min_order ASC
    `);
    res.json(success(result.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/vouchers/validate — Kiểm tra mã voucher
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json(error('Vui lòng nhập mã ưu đãi'));
    }

    const result = await query(`
      SELECT * FROM vouchers
      WHERE code = $1 AND active = true
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (max_uses IS NULL OR current_uses < max_uses)
    `, [code.toUpperCase()]);

    if (result.rows.length === 0) {
      return res.status(400).json(error('Mã ưu đãi không hợp lệ hoặc đã hết hạn'));
    }

    const voucher = result.rows[0];

    if (subtotal < voucher.min_order) {
      return res.status(400).json(error(
        `Đơn hàng tối thiểu ${voucher.min_order.toLocaleString('vi-VN')}đ để áp dụng mã này`
      ));
    }

    res.json(success(voucher));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

export default router;
