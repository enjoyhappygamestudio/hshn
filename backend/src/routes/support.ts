import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { success, error } from '../utils/response';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const publicRouter = Router();
const adminRouter = Router();

async function getSettingsRow() {
  const result = await query('SELECT * FROM support_settings ORDER BY updated_at DESC LIMIT 1');
  return result.rows[0] || null;
}

publicRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await getSettingsRow();
    const faqs = await query(
      `SELECT id, question, answer, sort_order FROM support_faqs
       WHERE active = true ORDER BY sort_order ASC, created_at ASC`,
    );
    res.json(success({
      hotline_display: settings?.hotline_display || '1900 123 456',
      hotline_tel: settings?.hotline_tel || '1900123456',
      hours: settings?.hours || '7:00 - 22:00 • Tất cả các ngày',
      zalo_url: settings?.zalo_url || 'https://zalo.me/1900123456',
      email: settings?.email || 'support@haisanhanoi.vn',
      office_address: settings?.office_address || 'Số 12, ngõ 88 Trần Duy Hưng, Cầu Giấy, Hà Nội',
      faqs: faqs.rows,
    }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

adminRouter.get('/', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await getSettingsRow();
    const faqs = await query(
      `SELECT * FROM support_faqs ORDER BY sort_order ASC, created_at ASC`,
    );
    res.json(success({ settings, faqs: faqs.rows }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

adminRouter.put('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { hotline_display, hotline_tel, hours, zalo_url, email, office_address } = req.body;
    if (!hotline_display || !email || !office_address) {
      return res.status(400).json(error('Vui lòng nhập hotline, email và địa chỉ văn phòng'));
    }
    const tel = (hotline_tel || String(hotline_display)).replace(/[^\d+]/g, '') || hotline_display;
    const existing = await getSettingsRow();
    let result;
    if (existing) {
      result = await query(
        `UPDATE support_settings SET
          hotline_display = $1, hotline_tel = $2, hours = $3,
          zalo_url = $4, email = $5, office_address = $6, updated_at = NOW()
         WHERE id = $7 RETURNING *`,
        [hotline_display, tel, hours || '', zalo_url || '', email, office_address, existing.id],
      );
    } else {
      result = await query(
        `INSERT INTO support_settings (hotline_display, hotline_tel, hours, zalo_url, email, office_address)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [hotline_display, tel, hours || '', zalo_url || '', email, office_address],
      );
    }
    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

adminRouter.post('/faqs', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { question, answer, sort_order, active } = req.body;
    if (!question || !answer) {
      return res.status(400).json(error('Vui lòng nhập câu hỏi và câu trả lời'));
    }
    const result = await query(
      `INSERT INTO support_faqs (question, answer, sort_order, active)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [question, answer, sort_order ?? 0, active !== false],
    );
    res.status(201).json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

adminRouter.put('/faqs/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { question, answer, sort_order, active } = req.body;
    const result = await query(
      `UPDATE support_faqs SET
        question = COALESCE($1, question),
        answer = COALESCE($2, answer),
        sort_order = COALESCE($3, sort_order),
        active = COALESCE($4, active),
        updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [question ?? null, answer ?? null, sort_order ?? null, typeof active === 'boolean' ? active : null, req.params.id],
    );
    if (result.rows.length === 0) return res.status(404).json(error('Không tìm thấy câu hỏi'));
    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

adminRouter.delete('/faqs/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM support_faqs WHERE id = $1', [req.params.id]);
    res.json(success({ message: 'Đã xóa câu hỏi' }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

export { publicRouter as supportPublicRouter, adminRouter as supportAdminRouter };
