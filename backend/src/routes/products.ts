import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { success, error, pagination } from '../utils/response';

const router = Router();

// GET /api/products — Danh sách sản phẩm
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, shop, search, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE p.active = true';
    const params: any[] = [];
    let paramIdx = 1;

    if (category) {
      where += ` AND p.category_id = $${paramIdx++}`;
      params.push(category);
    }
    if (shop) {
      where += ` AND p.shop_id = $${paramIdx++}`;
      params.push(shop);
    }
    if (search) {
      where += ` AND (LOWER(p.name) LIKE $${paramIdx} OR LOWER(p.description) LIKE $${paramIdx})`;
      params.push(`%${(search as string).toLowerCase()}%`);
      paramIdx++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM products p ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const sql = `
      SELECT p.*, s.name as shop_name, c.name as category_name, c.icon as category_icon
      FROM products p
      LEFT JOIN shops s ON p.shop_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${where}
      ORDER BY p.rating DESC, p.sold_count DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(limitNum, offset);

    const result = await query(sql, params);
    res.json(success(result.rows, pagination(pageNum, limitNum, total)));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/products/:id — Chi tiết sản phẩm
router.get('/:id', async (req: Request, res: Response) => {
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

    const product = result.rows[0];

    const variantsResult = await query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sort_order',
      [id],
    );

    res.json(success({ ...product, variants: variantsResult.rows }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/products/:id/variants — Biến thể sản phẩm
router.get('/:id/variants', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sort_order, label',
      [req.params.id],
    );
    res.json(success(result.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

export default router;
