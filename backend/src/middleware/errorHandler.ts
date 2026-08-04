import { Response } from 'express';
import { ZodError } from 'zod';
import { ApiResponse } from '../types';

export class AppError extends Error {
  public statusCode: number;
  public code?: string;

  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function errorHandler(err: Error, _req: any, res: Response, _next: any) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    } as ApiResponse);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Dữ liệu không hợp lệ',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    } as ApiResponse);
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    error: 'Máy chủ tạm thời lỗi, vui lòng thử lại',
  } as ApiResponse);
}
