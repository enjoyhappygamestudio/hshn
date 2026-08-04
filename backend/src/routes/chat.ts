import { Router, Response } from 'express';
import { query } from '../utils/db';
import { success, error } from '../utils/response';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/chat/conversations — My conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT c.id, c.subject, c.status, c.last_message_at, c.created_at,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.read = false AND m.sender_type = 'admin') AS unread
      FROM conversations c
      WHERE c.customer_id = $1
      ORDER BY c.last_message_at DESC
    `, [req.customerId]);
    res.json(success(result.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/chat/conversations — Create new conversation
router.post('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { subject, message } = req.body;
    if (!message) return res.status(400).json(error('Vui lòng nhập nội dung tin nhắn'));

    const conv = await query(
      `INSERT INTO conversations (customer_id, subject) VALUES ($1, $2)
       RETURNING id, subject, status, created_at`,
      [req.customerId, subject || 'Hỗ trợ từ khách hàng'],
    );
    const conversationId = conv.rows[0].id;

    await query(
      `INSERT INTO messages (conversation_id, sender_type, sender_id, content)
       VALUES ($1, 'customer', $2, $3)`,
      [conversationId, req.customerId, message],
    );

    await query('UPDATE conversations SET last_message_at = NOW() WHERE id = $1', [conversationId]);

    res.status(201).json(success(conv.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/chat/conversations/:id/messages — Tin nhắn trong hội thoại
router.get('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const conv = await query(
      'SELECT id, customer_id FROM conversations WHERE id = $1',
      [req.params.id],
    );
    if (conv.rows.length === 0) return res.status(404).json(error('Không tìm thấy hội thoại'));
    if (conv.rows[0].customer_id !== req.customerId) {
      return res.status(403).json(error('Không có quyền truy cập'));
    }

    const messages = await query(
      `SELECT id, sender_type, sender_id, content, image_url, read, created_at
       FROM messages WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [req.params.id],
    );

    // Mark admin messages as read
    await query(
      `UPDATE messages SET read = true
       WHERE conversation_id = $1 AND sender_type = 'admin' AND read = false`,
      [req.params.id],
    );

    res.json(success(messages.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/chat/conversations/:id/messages — Gửi tin nhắn
router.post('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { content, image_url } = req.body;
    if (!content && !image_url) return res.status(400).json(error('Vui lòng nhập nội dung'));

    const conv = await query(
      'SELECT id, customer_id FROM conversations WHERE id = $1',
      [req.params.id],
    );
    if (conv.rows.length === 0) return res.status(404).json(error('Không tìm thấy hội thoại'));
    if (conv.rows[0].customer_id !== req.customerId) {
      return res.status(403).json(error('Không có quyền truy cập'));
    }

    const msg = await query(
      `INSERT INTO messages (conversation_id, sender_type, sender_id, content, image_url)
       VALUES ($1, 'customer', $2, $3, $4)
       RETURNING id, sender_type, content, image_url, read, created_at`,
      [req.params.id, req.customerId, content || null, image_url || null],
    );

    await query('UPDATE conversations SET last_message_at = NOW() WHERE id = $1', [req.params.id]);

    res.status(201).json(success(msg.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// Admin routes (đặt riêng để admin dùng)
// GET /api/chat/admin/conversations — List all conversations for admin
router.get('/admin/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.isAdmin) return res.status(403).json(error('Từ chối truy cập'));

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status as string;
    const search = req.query.search as string;

    let sql = `
      SELECT c.id, c.subject, c.status, c.last_message_at, c.created_at,
        cu.name AS customer_name, cu.phone AS customer_phone,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.read = false AND m.sender_type = 'customer') AS unread_count,
        (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_preview
      FROM conversations c
      JOIN customers cu ON cu.id = c.customer_id
      WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (statusFilter) {
      sql += ` AND c.status = $${idx++}`;
      params.push(statusFilter);
    }
    if (search) {
      sql += ` AND (cu.name ILIKE $${idx} OR cu.phone ILIKE $${idx} OR c.subject ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ` ORDER BY c.last_message_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    const countResult = await query(
      `SELECT COUNT(*) FROM conversations c JOIN customers cu ON cu.id = c.customer_id`,
    );

    res.json(success({
      conversations: result.rows,
      pagination: { page, limit, total: parseInt(countResult.rows[0].count) },
    }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/chat/admin/conversations/:id/messages — Admin xem messages
router.get('/admin/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.isAdmin) return res.status(403).json(error('Từ chối truy cập'));

    const messages = await query(
      `SELECT m.id, m.sender_type, m.sender_id, m.content, m.image_url, m.read, m.created_at
       FROM messages m WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.id],
    );

    // Mark unread customer messages as read
    await query(
      `UPDATE messages SET read = true
       WHERE conversation_id = $1 AND sender_type = 'customer' AND read = false`,
      [req.params.id],
    );

    res.json(success(messages.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/chat/admin/conversations/:id/messages — Admin gửi tin nhắn
router.post('/admin/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.isAdmin) return res.status(403).json(error('Từ chối truy cập'));

    const { content, image_url } = req.body;
    if (!content && !image_url) return res.status(400).json(error('Vui lòng nhập nội dung'));

    const msg = await query(
      `INSERT INTO messages (conversation_id, sender_type, sender_id, content, image_url)
       VALUES ($1, 'admin', $2, $3, $4)
       RETURNING id, sender_type, content, image_url, read, created_at`,
      [req.params.id, req.adminId, content || null, image_url || null],
    );

    await query('UPDATE conversations SET last_message_at = NOW(), status = $1 WHERE id = $2',
      ['open', req.params.id]);

    // Create notification for customer
    const conv = await query('SELECT customer_id FROM conversations WHERE id = $1', [req.params.id]);
    if (conv.rows.length > 0) {
      await query(
        `INSERT INTO notifications (customer_id, title, body)
         VALUES ($1, 'Trả lời từ Hải Sản Hà Nội', $2)`,
        [conv.rows[0].customer_id, content || 'Shop đã gửi cho bạn một hình ảnh'],
      );
    }

    res.status(201).json(success(msg.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// PUT /api/chat/admin/conversations/:id/close — Đóng hội thoại
router.put('/admin/conversations/:id/close', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.isAdmin) return res.status(403).json(error('Từ chối truy cập'));
    await query('UPDATE conversations SET status = $1, updated_at = NOW() WHERE id = $2',
      ['closed', req.params.id]);
    res.json(success({ message: 'Đã đóng hội thoại' }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/chat/admin/unread-count — Tổng số tin chưa đọc (admin)
router.get('/admin/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.isAdmin) return res.status(403).json(error('Từ chối truy cập'));
    const result = await query(`
      SELECT COUNT(*)::int AS count FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.sender_type = 'customer' AND m.read = false
    `);
    res.json(success({ count: result.rows[0].count }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// DELETE /api/chat/admin/conversations/:id/messages/:msgId — Xóa tin nhắn
router.delete('/admin/conversations/:id/messages/:msgId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.isAdmin) return res.status(403).json(error('Từ chối truy cập'));
    const result = await query('DELETE FROM messages WHERE id = $1 AND conversation_id = $2', [req.params.msgId, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json(error('Không tìm thấy tin nhắn'));
    res.json(success({ message: 'Đã xóa tin nhắn' }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

export default router;
