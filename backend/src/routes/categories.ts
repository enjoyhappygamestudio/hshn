import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { success, error } from '../utils/response';

const router = Router();

// GET /api/categories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT c.*, COUNT(p.id)::int as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.active = true
      GROUP BY c.id
      ORDER BY c.sort_order
    `);
    res.json(success(result.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

export default router;
