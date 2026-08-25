import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import orderRoutes from './routes/orders';
import voucherRoutes from './routes/vouchers';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import videoRoutes from './routes/videos';
import shippingRoutes from './routes/shipping';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import invoiceRoutes from './routes/invoice';
import { supportPublicRouter, supportAdminRouter } from './routes/support';
import { config } from './config';
import { query } from './utils/db';
import { success, error } from './utils/response';

const uploadsDir = path.join(__dirname, '../uploads/videos');
fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  originAgentCluster: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      upgradeInsecureRequests: null,  // Disable HTTPS upgrade
    },
  },
}));
app.use(cors({ origin: config.corsOrigin || '*' }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Hải Sản Hà Nội API is running', timestamp: new Date().toISOString() });
});

// API Routes
app.get('/api/products/videos', async (_req, res) => {
  try {
    const result = await query(
      `SELECT v.id, v.url, v.thumbnail_url, v.duration, v.title, v.views,
              p.id as product_id, p.name as product_name, p.price as product_price,
              p.emoji as product_emoji, p.image_bg as product_image_bg,
              p.unit as product_unit, p.description as product_description,
              s.id as shop_id, s.name as shop_name, s.phone as shop_phone
       FROM product_videos v
       JOIN products p ON p.id = v.product_id
       LEFT JOIN shops s ON s.id = p.shop_id
       WHERE v.status = 'ready' AND p.active = true
       ORDER BY v.views DESC, v.created_at DESC`,
    );
    res.json(success(result.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/products/videos/:id/view — Increment view count
app.post('/api/products/videos/:id/view', async (req, res) => {
  try {
    await query('UPDATE product_videos SET views = COALESCE(views, 0) + 1 WHERE id = $1', [req.params.id]);
    res.json(success({ ok: true }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/products/videos/:id/comments — Get comments for a video
app.get('/api/products/videos/:id/comments', async (req, res) => {
  try {
    const result = await query(
      `SELECT vc.id, vc.video_id, vc.customer_id, vc.customer_name, vc.content, vc.parent_id, vc.created_at, vc.updated_at
       FROM video_comments vc
       WHERE vc.video_id = $1
       ORDER BY vc.created_at ASC`,
      [req.params.id],
    );
    res.json(success(result.rows));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/products/videos/:id/comments — Add a comment
app.post('/api/products/videos/:id/comments', async (req, res) => {
  try {
    const { customer_id, customer_name, content, parent_id } = req.body;
    if (!content?.trim()) return res.status(400).json(error('Nội dung bình luận không được để trống'));
    const result = await query(
      `INSERT INTO video_comments (video_id, customer_id, customer_name, content, parent_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, customer_id || null, customer_name || 'Khách', content.trim(), parent_id || null],
    );
    res.status(201).json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// PUT /api/products/videos/comments/:id — Update a comment
app.put('/api/products/videos/comments/:id', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json(error('Nội dung không được để trống'));
    const result = await query(
      `UPDATE video_comments SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [content.trim(), req.params.id],
    );
    if (result.rows.length === 0) return res.status(404).json(error('Không tìm thấy bình luận'));
    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// DELETE /api/products/videos/comments/:id — Delete a comment
app.delete('/api/products/videos/comments/:id', async (req, res) => {
  try {
    const result = await query(`DELETE FROM video_comments WHERE id = $1 RETURNING id`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json(error('Không tìm thấy bình luận'));
    res.json(success({ deleted: true }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/products/videos/:id/like — Check if user liked
app.get('/api/products/videos/:id/like', async (req, res) => {
  try {
    const customerId = req.query.customer_id as string;
    if (!customerId) return res.json(success({ liked: false, count: 0 }));
    const liked = await query('SELECT 1 FROM video_likes WHERE video_id = $1 AND customer_id = $2', [req.params.id, customerId]);
    const count = await query('SELECT COUNT(*) as cnt FROM video_likes WHERE video_id = $1', [req.params.id]);
    res.json(success({ liked: liked.rows.length > 0, count: parseInt(count.rows[0].cnt, 10) }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/products/videos/:id/like — Toggle like
app.post('/api/products/videos/:id/like', async (req, res) => {
  try {
    const { customer_id } = req.body;
    if (!customer_id) return res.status(400).json(error('Thiếu customer_id'));
    const existing = await query('SELECT 1 FROM video_likes WHERE video_id = $1 AND customer_id = $2', [req.params.id, customer_id]);
    if (existing.rows.length > 0) {
      await query('DELETE FROM video_likes WHERE video_id = $1 AND customer_id = $2', [req.params.id, customer_id]);
      res.json(success({ liked: false }));
    } else {
      await query('INSERT INTO video_likes (video_id, customer_id) VALUES ($1, $2)', [req.params.id, customer_id]);
      res.json(success({ liked: true }));
    }
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/products', videoRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/invoice', invoiceRoutes);
app.use('/api/admin/support', supportAdminRouter);
app.use('/api/support', supportPublicRouter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Error handler
app.use(errorHandler);

export default app;
