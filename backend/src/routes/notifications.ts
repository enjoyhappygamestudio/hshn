import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { success, error } from '../utils/response';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/notifications — Danh sách thông báo của user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, title, body, data, read, created_at
       FROM notifications
       WHERE customer_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.customerId],
    );
    res.json(success(result.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// PUT /api/notifications/:id/read — Đánh dấu đã đọc
router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `UPDATE notifications SET read = true
       WHERE id = $1 AND customer_id = $2
       RETURNING id, read`,
      [req.params.id, req.customerId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy thông báo'));
    }
    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// PUT /api/notifications/read-all — Đánh dấu tất cả đã đọc
router.put('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await query(
      `UPDATE notifications SET read = true
       WHERE customer_id = $1 AND read = false`,
      [req.customerId],
    );
    res.json(success({ message: 'Đã đánh dấu tất cả là đã đọc' }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

export default router;
