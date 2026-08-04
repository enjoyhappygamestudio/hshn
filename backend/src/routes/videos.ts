import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { success, error } from '../utils/response';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/products/:id/videos — Danh sách video của sản phẩm
router.get('/:id/videos', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, url, thumbnail_url, duration, file_size, is_primary, status,
              overlay_position, overlay_appear_at, overlay_disappear_at,
              title, description, video_category, sort_order, views
       FROM product_videos WHERE product_id = $1 AND status = 'ready'
       ORDER BY is_primary DESC, sort_order ASC, created_at ASC`,
      [req.params.id],
    );
    res.json(success(result.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// Admin: POST /api/admin/products/:id/videos — Thêm video cho sản phẩm
router.post('/admin/:id/videos', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.isAdmin) return res.status(403).json(error('Từ chối truy cập'));

    const { url, thumbnail_url, duration, file_size } = req.body;
    if (!url) return res.status(400).json(error('Vui lòng cung cấp URL video'));

    const result = await query(
      `INSERT INTO product_videos (product_id, url, thumbnail_url, duration, file_size, is_primary, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'ready')
       RETURNING id, url, thumbnail_url, duration, status`,
      [req.params.id, url, thumbnail_url || null, duration || 0, file_size || 0,
       req.body.is_primary || false],
    );

    res.status(201).json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// Admin: PUT /api/admin/products/:pid/videos/:vid — Cập nhật cấu hình video
router.put('/admin/:pid/videos/:vid', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.isAdmin) return res.status(403).json(error('Từ chối truy cập'));

    const { is_primary, overlay_position, overlay_appear_at, overlay_disappear_at } = req.body;

    if (is_primary) {
      await query('UPDATE product_videos SET is_primary = false WHERE product_id = $1', [req.params.pid]);
    }

    const result = await query(
      `UPDATE product_videos SET
        is_primary = COALESCE($1, is_primary),
        overlay_position = COALESCE($2, overlay_position),
        overlay_appear_at = COALESCE($3, overlay_appear_at),
        overlay_disappear_at = COALESCE($4, overlay_disappear_at),
        updated_at = NOW()
       WHERE id = $5 RETURNING id, is_primary, overlay_position, overlay_appear_at, overlay_disappear_at`,
      [is_primary ?? undefined, overlay_position ?? undefined,
       overlay_appear_at ?? undefined, overlay_disappear_at ?? undefined, req.params.vid],
    );

    if (result.rows.length === 0) return res.status(404).json(error('Không tìm thấy video'));
    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// Admin: DELETE /api/admin/products/:pid/videos/:vid — Xóa video
router.delete('/admin/:pid/videos/:vid', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.isAdmin) return res.status(403).json(error('Từ chối truy cập'));
    await query('DELETE FROM product_videos WHERE id = $1', [req.params.vid]);
    res.json(success({ message: 'Đã xóa video' }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

export default router;
