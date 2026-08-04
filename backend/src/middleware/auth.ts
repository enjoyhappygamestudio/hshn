import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  customerId?: string;
  adminId?: string;
  isAdmin?: boolean;
  role?: string;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Vui lòng đăng nhập', 401);
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.customerId = decoded.customerId;
    req.adminId = decoded.adminId;
    req.isAdmin = decoded.isAdmin || false;
    req.role = decoded.role;
    next();
  } catch {
    throw new AppError('Phiên đăng nhập hết hạn', 401);
  }
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.isAdmin) {
    throw new AppError('Không có quyền truy cập', 403);
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.isAdmin || !req.role) {
      throw new AppError('Không có quyền truy cập', 403);
    }
    if (!roles.includes(req.role)) {
      throw new AppError('Tài khoản không có quyền thực hiện hành động này', 403);
    }
    next();
  };
}
