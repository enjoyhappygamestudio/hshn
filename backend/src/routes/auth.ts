import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../utils/db';
import { success, error } from '../utils/response';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/send-otp — Gửi mã OTP xác thực số điện thoại
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json(error('Vui lòng nhập số điện thoại'));

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      `INSERT INTO password_reset_tokens (phone, code, expires_at) VALUES ($1, $2, $3)`,
      [phone, code, expiresAt],
    );

    res.json(success({ message: 'Mã xác nhận đã được gửi', code }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/auth/verify-otp — Xác thực mã OTP
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json(error('Vui lòng nhập số điện thoại và mã xác nhận'));
    }

    const token = await query(
      `SELECT id, expires_at, used FROM password_reset_tokens
       WHERE phone = $1 AND code = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone, code],
    );

    if (token.rows.length === 0) {
      return res.status(400).json(error('Mã xác nhận không hợp lệ hoặc đã hết hạn'));
    }

    await query('UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [token.rows[0].id]);

    res.json(success({ message: 'Xác thực số điện thoại thành công', verified: true }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, phone, password, email } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json(error('Vui lòng nhập đầy đủ thông tin'));
    }

    const existing = await query('SELECT id FROM customers WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      return res.status(400).json(error('Số điện thoại đã được đăng ký'));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO customers (name, phone, password_hash, email) VALUES ($1, $2, $3, $4) RETURNING id, name, phone, email, tier`,
      [name, phone, passwordHash, email || null],
    );

    const customer = result.rows[0];
    const token = jwt.sign(
      { customerId: customer.id, isAdmin: false },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any },
    );

    res.status(201).json(success({ customer, token }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/auth/forgot-password — Yêu cầu mã đặt lại mật khẩu
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json(error('Vui lòng nhập số điện thoại'));

    const existing = await query('SELECT id FROM customers WHERE phone = $1', [phone]);
    if (existing.rows.length === 0) {
      return res.status(400).json(error('Số điện thoại chưa được đăng ký'));
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    await query(
      `INSERT INTO password_reset_tokens (phone, code, expires_at) VALUES ($1, $2, $3)`,
      [phone, code, expiresAt],
    );

    // In production, send via SMS/Email. For now return in response.
    res.json(success({ message: 'Mã xác nhận đã được gửi', code }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/auth/reset-password — Đặt lại mật khẩu với mã xác nhận
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { phone, code, password } = req.body;
    if (!phone || !code || !password) {
      return res.status(400).json(error('Vui lòng nhập đầy đủ thông tin'));
    }
    if (password.length < 6) {
      return res.status(400).json(error('Mật khẩu phải có ít nhất 6 ký tự'));
    }

    const token = await query(
      `SELECT id, expires_at, used FROM password_reset_tokens
       WHERE phone = $1 AND code = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone, code],
    );

    if (token.rows.length === 0) {
      return res.status(400).json(error('Mã xác nhận không hợp lệ hoặc đã hết hạn'));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await query('UPDATE customers SET password_hash = $1 WHERE phone = $2',
      [passwordHash, phone]);
    await query('UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [token.rows[0].id]);

    res.json(success({ message: 'Mật khẩu đã được đặt lại thành công' }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json(error('Vui lòng nhập số điện thoại và mật khẩu'));
    }

    const result = await query(
      'SELECT id, name, phone, password_hash, tier, avatar_url, email, address, order_count FROM customers WHERE phone = $1',
      [phone],
    );

    if (result.rows.length === 0) {
      return res.status(401).json(error('Số điện thoại hoặc mật khẩu không đúng'));
    }

    const customer = result.rows[0];
    const valid = await bcrypt.compare(password, customer.password_hash);
    if (!valid) {
      return res.status(401).json(error('Số điện thoại hoặc mật khẩu không đúng'));
    }

    const token = jwt.sign(
      { customerId: customer.id, isAdmin: false },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any },
    );

    const { password_hash, ...safeCustomer } = customer;
    res.json(success({ customer: safeCustomer, token }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/auth/me — Thông tin hiện tại
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT c.id, c.name, c.phone, c.email, c.avatar_url, c.tier, c.order_count,
             c.address, c.created_at
      FROM customers c WHERE c.id = $1
    `, [req.customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json(error('Không tìm thấy người dùng'));
    }

    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/auth/admin/login — Admin login
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json(error('Vui lòng nhập số điện thoại và mật khẩu'));
    }

    const result = await query(
      'SELECT id, name, phone, email, password_hash, role, avatar_url FROM admin_users WHERE phone = $1 AND active = true',
      [phone],
    );

    if (result.rows.length === 0) {
      return res.status(401).json(error('Số điện thoại hoặc mật khẩu không đúng'));
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json(error('Số điện thoại hoặc mật khẩu không đúng'));
    }

    const token = jwt.sign(
      { adminId: admin.id, role: admin.role, isAdmin: true },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any },
    );

    // Update last login
    await query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [admin.id]);

    const { password_hash, ...safeAdmin } = admin;
    res.json(success({ admin: safeAdmin, token }));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// PUT /api/auth/profile — Cập nhật profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, address } = req.body;
    const result = await query(`
      UPDATE customers SET name = COALESCE($1, name), email = COALESCE($2, email),
        address = COALESCE($3, address), updated_at = NOW()
      WHERE id = $4 RETURNING id, name, phone, email, tier, address
    `, [name, email, address, req.customerId]);

    res.json(success(result.rows[0]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

export default router;
